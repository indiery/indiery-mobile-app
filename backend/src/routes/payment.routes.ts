import { Router } from 'express';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { WalletLedger } from '../models/WalletLedger';
import { ApiError, asyncRoute } from '../middleware/error';
import { serializeOrder } from '../services/serialize.service';
import { sendPush } from '../services/notification.service';
import { verifyRazorpayWebhookSignature } from '../services/payment.service';
import { emitOrderChanged, emitPartnerQueueChanged } from '../realtime/socket';

export const paymentRouter = Router();

async function populatedOrder(orderId: string) {
  return Order.findById(orderId)
    .populate('vehicle')
    .populate('partner')
    .populate('customer');
}

async function notifyPartners(orderId: string) {
  const order = await populatedOrder(orderId);
  if (!order) return;
  const vehicleId =
    order.vehicle && typeof order.vehicle === 'object' && '_id' in order.vehicle
      ? String(order.vehicle._id)
      : String(order.vehicle || '');
  const onlinePartners = await User.find({
    role: 'partner',
    'partnerProfile.online': true,
    'partnerProfile.kycStatus': 'verified',
    'partnerProfile.walletBalance': { $gte: 200 },
    'partnerProfile.vehicleId': vehicleId
  }).select('expoPushTokens');
  await Promise.all(
    onlinePartners.map((partner) =>
      sendPush(partner.expoPushTokens, 'New Indiery order', `${order.pickup.label} to ${order.drop.label}`, {
        orderId: String(order._id),
        orderNo: order.orderNo
      })
    )
  );
  emitPartnerQueueChanged();
}

async function settleWalletTopup(razorpayOrderId: string) {
  const ledger = await WalletLedger.findOneAndUpdate(
    {
      reference: razorpayOrderId,
      kind: 'credit',
      bucket: 'cash',
      settled: false
    },
    {
      title: 'Wallet top-up',
      settled: true
    },
    { new: true }
  );
  if (!ledger) return;
  const user = await User.findById(ledger.user).select('role');
  if (user?.role === 'partner') {
    await User.updateOne({ _id: ledger.user }, { $inc: { 'partnerProfile.walletBalance': ledger.amount } });
  } else {
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
      }
      if (!wasPaid) await notifyPartners(String(order._id));
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
