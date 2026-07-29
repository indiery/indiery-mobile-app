import { Router } from 'express';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { WalletLedger } from '../models/WalletLedger';
import { ApiError, asyncRoute } from '../middleware/error';
import { serializeOrder } from '../services/serialize.service';
import { verifyRazorpayWebhookSignature } from '../services/payment.service';
import { emitOrderChanged } from '../realtime/socket';
import { offerOrderToNextDrivers } from '../services/order-offers.service';
import { sendPush } from '../services/notification.service';

export const paymentRouter = Router();

async function populatedOrder(orderId: string) {
  return Order.findById(orderId)
    .populate('vehicle')
    .populate('partner')
    .populate('customer');
}

async function settleWalletTopup(razorpayOrderId: string) {
  const ledger = await WalletLedger.findOneAndUpdate(
    {
      reference: razorpayOrderId,
      kind: 'credit',
      settled: false
    },
    { settled: true },
    { new: true }
  );
  if (!ledger) return;
  const user = await User.findById(ledger.user).select('role');
  if (user?.role === 'partner') {
    ledger.title = 'Partner wallet top-up';
    await ledger.save();
    await User.updateOne({ _id: ledger.user }, { $inc: { 'partnerProfile.walletBalance': ledger.amount } });
  } else if (ledger.bucket === 'coins') {
    ledger.title = 'Indiery Coins recharge';
    await ledger.save();
    await User.updateOne({ _id: ledger.user }, { $inc: { 'customerProfile.coins': ledger.amount } });
  } else {
    ledger.title = 'Wallet top-up';
    await ledger.save();
    await User.updateOne({ _id: ledger.user }, { $inc: { 'customerProfile.walletBalance': ledger.amount } });
  }
}

paymentRouter.post(
  '/razorpay/webhook',
  asyncRoute(async (req, res) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    const signature = req.header('x-razorpay-signature') ?? undefined;
    if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
      throw new ApiError(400, 'Invalid Razorpay webhook signature');
    }

    const event = JSON.parse(rawBody.toString('utf8')) as {
      event?: string;
      payload?: {
        payment?: {
          entity?: {
            order_id?: string;
            status?: string;
          };
        };
      };
    };

    const razorpayOrderId = event.payload?.payment?.entity?.order_id;
    if (!razorpayOrderId) return res.json({ ok: true });

    const order = await Order.findOne({ paymentProvider: 'razorpay', paymentReference: razorpayOrderId });
    if (!order) {
      if (event.event === 'payment.captured' || event.payload?.payment?.entity?.status === 'captured') {
        await settleWalletTopup(razorpayOrderId);
      }
      return res.json({ ok: true });
    }

    const paymentStatus = event.payload?.payment?.entity?.status;
    if (event.event === 'payment.captured' || paymentStatus === 'captured') {
      const wasPaid = order.paymentStatus === 'paid';
      order.paymentStatus = 'paid';
      await order.save();
      if (!wasPaid && order.fare.coins > 0) {
        await User.updateOne({ _id: order.customer }, { $inc: { 'customerProfile.coins': -order.fare.coins } });
        await WalletLedger.create({
          user: order.customer,
          order: order._id,
          amount: order.fare.coins,
          kind: 'debit',
          bucket: 'coins',
          title: `Coins used ${order.orderNo}`,
          reference: order.orderNo,
          settled: true
        });
      }
      const fullOrder = await populatedOrder(String(order._id));
      if (fullOrder) {
        const payload = serializeOrder(fullOrder);
        emitOrderChanged(payload, String(order.customer), order.partner ? String(order.partner) : undefined);
        if (!wasPaid) {
          const customer = fullOrder.customer as unknown as { expoPushTokens?: string[] } | undefined;
          await sendPush(
            customer?.expoPushTokens,
            'Payment received',
            `${order.orderNo} is paid. We are finding a driver now.`,
            {
              event: 'payment_received',
              role: 'customer',
              screen: 'orders',
              orderId: String(order._id),
              orderNo: order.orderNo,
              status: order.status,
              paymentStatus: 'paid'
            },
            { ttl: 1800, collapseId: `order-${String(order._id)}-payment-${Date.now()}` }
          );
        }
      }
      if (!wasPaid) await offerOrderToNextDrivers(order._id, { reason: 'payment' });
      return res.json({ ok: true });
    }

    if (event.event === 'payment.failed' || paymentStatus === 'failed') {
      if (order.paymentStatus === 'pending') {
        order.paymentStatus = 'failed';
        await order.save();
        const fullOrder = await populatedOrder(String(order._id));
        if (fullOrder) emitOrderChanged(serializeOrder(fullOrder), String(order.customer));
      }
    }

    return res.json({ ok: true });
  })
);
