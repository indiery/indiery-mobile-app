import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { ApiError, asyncRoute } from '../middleware/error';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { WalletLedger } from '../models/WalletLedger';
import { createTimeline, setOrderStatusTimeline } from '../services/timeline.service';
import { serializeOrder, serializeUser } from '../services/serialize.service';
import { compareOtp } from '../services/otp.service';
import { requestPartnerPayout } from '../services/payout.service';
import { calculateDeliverySettlement } from '../services/settlement.service';
import { sendPush } from '../services/notification.service';
import { emitOrderChanged, emitPartnerQueueChanged } from '../realtime/socket';
import { initialsFromName } from '../services/profile.service';

export const partnerRouter = Router();

partnerRouter.use(requireAuth(['partner']));

const availableOrderQuery = {
  status: { $in: ['searching', 'offered'] },
  $or: [{ paymentStatus: 'paid' }, { paymentMode: 'cash' }]
};

const ProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120).optional().or(z.literal('')),
  city: z.string().trim().min(2).max(80),
  vehicleNumber: z.string().trim().max(30).optional().or(z.literal(''))
});

async function loadPartner(userId: string) {
  const partner = await User.findById(userId).populate('partnerProfile.vehicleId');
  if (!partner || partner.role !== 'partner') throw new ApiError(404, 'Partner not found');
  return partner;
}

async function getPartnerStats(userId: string) {
  const [availableCount, activeCount, completedCount, ledger] = await Promise.all([
    Order.countDocuments(availableOrderQuery),
    Order.countDocuments({ partner: userId, status: { $in: ['accepted', 'arrived_pickup', 'picked_up', 'in_transit'] } }),
    Order.countDocuments({ partner: userId, status: 'delivered' }),
    WalletLedger.find({ user: userId }).sort({ createdAt: -1 }).limit(20)
  ]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayLedger = ledger.filter((item) => item.createdAt >= todayStart);
  const todayEarn = todayLedger.reduce((sum, item) => sum + (item.kind === 'credit' ? item.amount : -item.amount), 0);

  return {
    availableCount,
    activeCount,
    completedCount,
    todayEarn,
    ledger: ledger.map((item) => ({
      id: String(item._id),
      amount: item.amount,
      kind: item.kind,
      title: item.title,
      reference: item.reference,
      createdAt: item.createdAt
    }))
  };
}

async function loadOrderForPartner(orderId: string) {
  return Order.findById(orderId)
    .populate('vehicle')
    .populate('customer')
    .populate('partner');
}

partnerRouter.get(
  '/bootstrap',
  asyncRoute(async (req: AuthRequest, res) => {
    const partner = await loadPartner(req.auth!.userId);
    const stats = await getPartnerStats(req.auth!.userId);
    const [availableOrders, activeOrders, completedOrders] = await Promise.all([
      Order.find(availableOrderQuery)
        .sort({ createdAt: -1 })
        .limit(30)
        .populate('vehicle')
        .populate('customer')
        .populate('partner'),
      Order.find({ partner: req.auth!.userId, status: { $in: ['accepted', 'arrived_pickup', 'picked_up', 'in_transit'] } })
        .sort({ updatedAt: -1 })
        .populate('vehicle')
        .populate('customer')
        .populate('partner'),
      Order.find({ partner: req.auth!.userId, status: 'delivered' })
        .sort({ updatedAt: -1 })
        .limit(20)
        .populate('vehicle')
        .populate('customer')
        .populate('partner')
    ]);

    res.json({
      user: serializeUser(partner),
      stats,
      availableOrders: availableOrders.map(serializeOrder),
      activeOrders: activeOrders.map(serializeOrder),
      completedOrders: completedOrders.map(serializeOrder)
    });
  })
);

partnerRouter.patch(
  '/profile',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = ProfileSchema.parse(req.body);
    const partner = await loadPartner(req.auth!.userId);
    partner.name = body.name;
    partner.initials = initialsFromName(body.name);
    partner.email = body.email || undefined;
    partner.city = body.city;
    partner.set('partnerProfile.vehicleNumber', body.vehicleNumber || '');
    await partner.save();
    res.json({ user: serializeUser(partner) });
  })
);

partnerRouter.post(
  '/availability',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = z.object({ online: z.boolean() }).parse(req.body);
    if (body.online) {
      const partner = await loadPartner(req.auth!.userId);
      if (partner.partnerProfile?.kycStatus !== 'verified') {
        throw new ApiError(403, 'KYC verification is required before going online');
      }
    }
    const partner = await User.findByIdAndUpdate(
      req.auth!.userId,
      { 'partnerProfile.online': body.online },
      { new: true }
    );
    if (!partner) throw new ApiError(404, 'Partner not found');
    emitPartnerQueueChanged();
    res.json({ user: serializeUser(partner) });
  })
);

partnerRouter.post(
  '/push-token',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = z.object({ token: z.string().min(8) }).parse(req.body);
    const partner = await User.findByIdAndUpdate(
      req.auth!.userId,
      { $addToSet: { expoPushTokens: body.token } },
      { new: true }
    );
    if (!partner) throw new ApiError(404, 'Partner not found');
    res.json({ user: serializeUser(partner) });
  })
);

partnerRouter.post(
  '/location',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = z
      .object({
        lat: z.coerce.number(),
        lng: z.coerce.number(),
        heading: z.coerce.number().optional(),
        speed: z.coerce.number().optional()
      })
      .parse(req.body);
    const currentLocation = { ...body, updatedAt: new Date() };
    const partner = await User.findByIdAndUpdate(
      req.auth!.userId,
      { 'partnerProfile.currentLocation': currentLocation },
      { new: true }
    );
    if (!partner) throw new ApiError(404, 'Partner not found');

    const activeOrders = await Order.find({
      partner: req.auth!.userId,
      status: { $in: ['accepted', 'arrived_pickup', 'picked_up', 'in_transit'] }
    });
    await Promise.all(
      activeOrders.map(async (order) => {
        order.partnerLocation = currentLocation;
        await order.save();
        const fullOrder = await loadOrderForPartner(String(order._id));
        const payload = fullOrder ? serializeOrder(fullOrder) : { id: String(order._id) };
        emitOrderChanged(payload, String(order.customer), req.auth!.userId);
      })
    );

    res.json({ user: serializeUser(partner), activeOrderCount: activeOrders.length });
  })
);

partnerRouter.post(
  '/orders/:orderId/accept',
  asyncRoute(async (req: AuthRequest, res) => {
    const partner = await loadPartner(req.auth!.userId);
    if (partner.partnerProfile?.kycStatus !== 'verified') {
      throw new ApiError(403, 'KYC verification is required before accepting orders');
    }
    if (!partner.partnerProfile?.online) throw new ApiError(400, 'Go online before accepting orders');
    const order = await Order.findById(String(req.params.orderId));
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.paymentMode !== 'cash' && order.paymentStatus !== 'paid') {
      throw new ApiError(402, 'Customer payment is pending');
    }

    const activeStatuses = ['accepted', 'arrived_pickup', 'picked_up', 'in_transit'];
    if (order.partner && String(order.partner) === req.auth!.userId && activeStatuses.includes(order.status)) {
      const fullOrder = await loadOrderForPartner(String(order._id));
      return res.json({ order: fullOrder ? serializeOrder(fullOrder) : { id: String(order._id) } });
    }

    if (!['searching', 'offered'].includes(order.status)) {
      throw new ApiError(404, 'Order no longer available');
    }
    if (order.partner && String(order.partner) !== req.auth!.userId) {
      throw new ApiError(409, 'Order already accepted by another partner');
    }

    order.partner = partner._id;
    setOrderStatusTimeline(order, 'accepted');
    if (partner.partnerProfile?.currentLocation) {
      order.partnerLocation = partner.partnerProfile.currentLocation;
    }
    await order.save();
    const fullOrder = await loadOrderForPartner(String(order._id));
    const payload = fullOrder ? serializeOrder(fullOrder) : { id: String(order._id) };
    const customer = fullOrder?.customer as unknown as { expoPushTokens?: string[] } | undefined;
    await sendPush(customer?.expoPushTokens, 'Driver assigned', `${partner.name} accepted ${order.orderNo}`, {
      orderId: String(order._id),
      orderNo: order.orderNo
    }).catch(() => undefined);
    emitOrderChanged(payload, String(order.customer), String(partner._id));
    emitPartnerQueueChanged();
    res.json({ order: payload });
  })
);

partnerRouter.post(
  '/orders/:orderId/reject',
  asyncRoute(async (req: AuthRequest, res) => {
    const order = await loadOrderForPartner(String(req.params.orderId));
    if (!order) throw new ApiError(404, 'Order not found');
    res.json({ order: serializeOrder(order), rejected: true });
  })
);

partnerRouter.post(
  '/orders/:orderId/otp/verify',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = z.object({ type: z.enum(['pickup', 'drop']), otp: z.string().min(4) }).parse(req.body);
    const order = await Order.findOne({ _id: String(req.params.orderId), partner: req.auth!.userId });
    if (!order) throw new ApiError(404, 'Order not found');
    const hash = body.type === 'pickup' ? order.verification?.pickupOtpHash : order.verification?.dropOtpHash;
    const ok = await compareOtp(body.otp, hash ?? undefined);
    if (!ok) throw new ApiError(400, 'Invalid OTP');
    if (body.type === 'pickup') order.pod.pickupOtpVerified = true;
    else order.pod.dropOtpVerified = true;
    await order.save();
    const fullOrder = await loadOrderForPartner(String(order._id));
    const payload = fullOrder ? serializeOrder(fullOrder) : { id: String(order._id) };
    emitOrderChanged(payload, String(order.customer), req.auth!.userId);
    res.json({ order: payload, verified: true });
  })
);

partnerRouter.post(
  '/orders/:orderId/status',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = z
      .object({
        status: z.enum(['arrived_pickup', 'picked_up', 'in_transit', 'delivered'])
      })
      .parse(req.body);
    const order = await Order.findOne({ _id: String(req.params.orderId), partner: req.auth!.userId });
    if (!order) throw new ApiError(404, 'Order not found');

    const allowed: Record<string, string[]> = {
      accepted: ['arrived_pickup'],
      arrived_pickup: ['picked_up'],
      picked_up: ['in_transit'],
      in_transit: ['delivered']
    };
    if (!allowed[order.status]?.includes(body.status)) throw new ApiError(400, 'Invalid order transition');
    if (body.status === 'picked_up' && !order.pod.pickupOtpVerified) {
      throw new ApiError(400, 'Verify pickup OTP before marking picked up');
    }
    if (body.status === 'delivered' && !order.pod.dropOtpVerified) {
      throw new ApiError(400, 'Verify drop OTP before marking delivered');
    }

    setOrderStatusTimeline(order, body.status);
    await order.save();

    if (body.status === 'delivered') {
      const settlement = calculateDeliverySettlement(order);
      order.set('settlement', settlement);
      await order.save();

      await User.updateOne(
        { _id: req.auth!.userId },
        {
          $inc: {
            'partnerProfile.walletBalance': settlement.partnerCredit,
            'partnerProfile.weeklyOrders': 1
          }
        }
      );
      await WalletLedger.create({
        user: req.auth!.userId,
        order: order._id,
        amount: settlement.partnerCredit,
        kind: 'credit',
        bucket: 'cash',
        title: settlement.delayed ? `Order ${order.orderNo} delayed payout` : `Order ${order.orderNo} on-time payout`,
        reference: order.orderNo
      });

      if (settlement.customerRefundCoins > 0) {
        await User.updateOne(
          { _id: order.customer },
          { $inc: { 'customerProfile.coins': settlement.customerRefundCoins } }
        );
        await WalletLedger.create({
          user: order.customer,
          order: order._id,
          amount: settlement.customerRefundCoins,
          kind: 'credit',
          bucket: 'coins',
          title: `Late delivery refund ${order.orderNo}`,
          reference: order.orderNo,
          settled: true
        });
      }
    }

    const fullOrder = await loadOrderForPartner(String(order._id));
    const payload = fullOrder ? serializeOrder(fullOrder) : { id: String(order._id) };
    emitOrderChanged(payload, String(order.customer), req.auth!.userId);
    emitPartnerQueueChanged();
    res.json({ order: payload });
  })
);

partnerRouter.post(
  '/orders/:orderId/pod',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = z
      .object({
        type: z.enum(['pickup', 'drop']),
        photoUrl: z.string().url()
      })
      .parse(req.body);
    const order = await Order.findOne({ _id: String(req.params.orderId), partner: req.auth!.userId });
    if (!order) throw new ApiError(404, 'Order not found');
    if (body.type === 'pickup') {
      order.pod.pickupPhotoUrl = body.photoUrl;
    } else {
      order.pod.dropPhotoUrl = body.photoUrl;
    }
    await order.save();
    const fullOrder = await loadOrderForPartner(String(order._id));
    const payload = fullOrder ? serializeOrder(fullOrder) : { id: String(order._id) };
    emitOrderChanged(payload, String(order.customer), req.auth!.userId);
    res.json({ order: payload });
  })
);

partnerRouter.post(
  '/payouts/request',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = z.object({ amount: z.coerce.number().positive() }).parse(req.body);
    const payout = await requestPartnerPayout(req.auth!.userId, body.amount);
    res.json({
      reference: payout.reference,
      status: payout.status,
      amount: payout.amount,
      user: serializeUser(payout.user)
    });
  })
);

partnerRouter.post(
  '/kyc/:documentKey',
  asyncRoute(async (req: AuthRequest, res) => {
    const key = z.enum(['selfie', 'pan', 'drivingLicence', 'rc', 'insurance', 'bank']).parse(String(req.params.documentKey));
    const body = z.object({ photoUrl: z.string().optional() }).parse(req.body ?? {});
    const partner = await loadPartner(req.auth!.userId);
    partner.set(`partnerProfile.docs.${key}`, true);
    if (body.photoUrl) partner.set(`partnerProfile.docUrls.${key}`, body.photoUrl);
    partner.set('partnerProfile.kycStatus', 'pending');
    await partner.save();
    res.json({ user: serializeUser(partner) });
  })
);
