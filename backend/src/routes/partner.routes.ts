import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { ApiError, asyncRoute } from '../middleware/error';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';
import { Order } from '../models/Order';
import { WalletLedger } from '../models/WalletLedger';
import { createTimeline, setOrderStatusTimeline } from '../services/timeline.service';
import { serializeOrder, serializeUser, serializeVehicle } from '../services/serialize.service';
import { compareOtp } from '../services/otp.service';
import { requestPartnerPayout } from '../services/payout.service';
import { calculateDeliverySettlement } from '../services/settlement.service';
import { applyWaitingChargeToFare } from '../services/fare.service';
import { sendPush } from '../services/notification.service';
import { createPaymentIntent, verifyRazorpayPaymentSignature } from '../services/payment.service';
import { emitOrderChanged, emitPartnerQueueChanged } from '../realtime/socket';
import { initialsFromName } from '../services/profile.service';
import {
  advanceExpiredOrderOffers,
  MIN_PARTNER_WALLET_BALANCE,
  rejectDriverOffer
} from '../services/order-offers.service';

export const partnerRouter = Router();

partnerRouter.use(requireAuth(['partner']));

const baseAvailableOrderQuery = {
  status: 'offered',
  $or: [{ paymentStatus: 'paid' }, { paymentMode: 'cash' }]
};

const ProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120).optional().or(z.literal('')),
  city: z.string().trim().min(2).max(80),
  vehicleId: z.string().min(1),
  vehicleNumber: z.string().trim().max(30).optional().or(z.literal(''))
});

const WalletTopupSchema = z.object({
  amount: z.coerce.number().min(50).max(20000),
  paymentMode: z.enum(['upi', 'card', 'netbanking']).default('upi')
});

const RazorpayVerifySchema = z.object({
  razorpayOrderId: z.string().min(6),
  razorpayPaymentId: z.string().min(6),
  razorpaySignature: z.string().min(20)
});

async function loadPartner(userId: string) {
  const partner = await User.findById(userId).populate('partnerProfile.vehicleId');
  if (!partner || partner.role !== 'partner') throw new ApiError(404, 'Partner not found');
  return partner;
}

function idOf(value: unknown) {
  if (!value) return undefined;
  if (typeof value === 'object' && '_id' in value) return String((value as { _id: unknown })._id);
  return String(value);
}

function partnerVehicleId(partner: Awaited<ReturnType<typeof loadPartner>>) {
  return idOf(partner.partnerProfile?.vehicleId);
}

function orderTimelineTime(order: Awaited<ReturnType<typeof loadOrderForPartner>>, key: string) {
  const at = order?.timeline?.find((item) => item.key === key)?.at;
  if (!at) return undefined;
  const time = new Date(at).getTime();
  return Number.isNaN(time) ? undefined : time;
}

function availableOrderQueryForVehicle(vehicleId?: string, partnerId?: string) {
  if (!vehicleId || !partnerId) return undefined;
  return { ...baseAvailableOrderQuery, vehicle: vehicleId, offeredPartnerIds: partnerId };
}

function partnerWalletBalance(partner: Awaited<ReturnType<typeof loadPartner>>) {
  return partner.partnerProfile?.walletBalance ?? 0;
}

function hasMinimumPartnerWallet(partner: Awaited<ReturnType<typeof loadPartner>>) {
  return partnerWalletBalance(partner) >= MIN_PARTNER_WALLET_BALANCE;
}

function assertMinimumPartnerWallet(partner: Awaited<ReturnType<typeof loadPartner>>) {
  const balance = partnerWalletBalance(partner);
  if (balance < MIN_PARTNER_WALLET_BALANCE) {
    throw new ApiError(402, `Recharge wallet to at least INR ${MIN_PARTNER_WALLET_BALANCE} to receive orders`);
  }
}

async function getPartnerStats(userId: string, availableQuery?: ReturnType<typeof availableOrderQueryForVehicle>) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [availableCount, activeCount, completedCount, ledger, completedToday] = await Promise.all([
    availableQuery ? Order.countDocuments(availableQuery) : Promise.resolve(0),
    Order.countDocuments({ partner: userId, status: { $in: ['accepted', 'arrived_pickup', 'picked_up', 'in_transit'] } }),
    Order.countDocuments({ partner: userId, status: 'delivered' }),
    WalletLedger.find({ user: userId }).sort({ createdAt: -1 }).limit(20),
    Order.find({ partner: userId, status: 'delivered', updatedAt: { $gte: todayStart } }).select('fare settlement')
  ]);

  const todayEarn = completedToday.reduce((sum, item) => sum + (item.settlement?.partnerCredit ?? item.fare?.partnerNet ?? 0), 0);

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
    const vehicleId = partnerVehicleId(partner);
    const canReceiveOrders = partner.partnerProfile?.kycStatus === 'verified' && hasMinimumPartnerWallet(partner);
    if (canReceiveOrders && vehicleId) {
      await advanceExpiredOrderOffers(vehicleId).catch(() => undefined);
    }
    const availableQuery = canReceiveOrders ? availableOrderQueryForVehicle(vehicleId, req.auth!.userId) : undefined;
    const stats = await getPartnerStats(req.auth!.userId, availableQuery);
    const [vehicles, availableOrders, activeOrders, completedOrders] = await Promise.all([
      Vehicle.find({ active: true }).sort({ capacityKg: 1 }),
      availableQuery
        ? Order.find(availableQuery)
            .sort({ createdAt: -1 })
            .limit(30)
            .populate('vehicle')
            .populate('customer')
            .populate('partner')
        : Promise.resolve([]),
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
      vehicles: vehicles.map(serializeVehicle),
      stats,
      availableOrders: availableOrders.map((order) => serializeOrder(order)),
      activeOrders: activeOrders.map((order) => serializeOrder(order)),
      completedOrders: completedOrders.map((order) => serializeOrder(order))
    });
  })
);

partnerRouter.patch(
  '/profile',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = ProfileSchema.parse(req.body);
    const vehicle = await Vehicle.findOne({ _id: body.vehicleId, active: true });
    if (!vehicle) throw new ApiError(400, 'Select a valid vehicle type');
    const partner = await loadPartner(req.auth!.userId);
    partner.name = body.name;
    partner.initials = initialsFromName(body.name);
    partner.email = body.email || undefined;
    partner.city = body.city;
    partner.set('partnerProfile.vehicleId', vehicle._id);
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
      assertMinimumPartnerWallet(partner);
    }
    const partner = await User.findByIdAndUpdate(
      req.auth!.userId,
      { 'partnerProfile.online': body.online },
      { new: true }
    );
    if (!partner) throw new ApiError(404, 'Partner not found');
    if (body.online) {
      await advanceExpiredOrderOffers(idOf(partner.partnerProfile?.vehicleId)).catch(() => undefined);
    }
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
    if (partner.partnerProfile?.online) {
      await advanceExpiredOrderOffers(idOf(partner.partnerProfile?.vehicleId)).catch(() => undefined);
    }

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
    assertMinimumPartnerWallet(partner);
    const vehicleId = partnerVehicleId(partner);
    if (!partner.partnerProfile?.online) throw new ApiError(400, 'Go online before accepting orders');
    const order = await Order.findById(String(req.params.orderId));
    if (!order) throw new ApiError(404, 'Order not found');
    if (!vehicleId || idOf(order.vehicle) !== vehicleId) {
      throw new ApiError(403, 'This order is for a different vehicle type');
    }
    if (order.paymentMode !== 'cash' && order.paymentStatus !== 'paid') {
      throw new ApiError(402, 'Customer payment is pending');
    }

    const activeStatuses = ['accepted', 'arrived_pickup', 'picked_up', 'in_transit'];
    if (order.partner && String(order.partner) === req.auth!.userId && activeStatuses.includes(order.status)) {
      const fullOrder = await loadOrderForPartner(String(order._id));
      return res.json({ order: fullOrder ? serializeOrder(fullOrder) : { id: String(order._id) } });
    }
    const activeOrder = await Order.findOne({
      _id: { $ne: order._id },
      partner: partner._id,
      status: { $in: activeStatuses }
    });
    if (activeOrder) {
      throw new ApiError(400, 'Complete your active order before accepting another');
    }

    if (!['searching', 'offered'].includes(order.status)) {
      throw new ApiError(404, 'Order no longer available');
    }
    if (order.partner && String(order.partner) !== req.auth!.userId) {
      throw new ApiError(409, 'Order already accepted by another partner');
    }
    const offeredPartnerIds = ((order.offeredPartnerIds ?? []) as unknown[]).map(idOf);
    if (!offeredPartnerIds.includes(req.auth!.userId)) {
      throw new ApiError(403, 'This order is not currently offered to you');
    }

    const updateSet: Record<string, unknown> = {
      partner: partner._id,
      status: 'accepted',
      timeline: createTimeline('accepted', order.timeline ?? []),
      offeredPartnerIds: []
    };
    if (partner.partnerProfile?.currentLocation) {
      updateSet.partnerLocation = partner.partnerProfile.currentLocation;
    }
    const acceptedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        status: { $in: ['searching', 'offered'] },
        offeredPartnerIds: partner._id,
        $or: [{ partner: { $exists: false } }, { partner: null }]
      },
      {
        $set: updateSet,
        $unset: {
          offerBatchStartedAt: '',
          offerExpiresAt: ''
        }
      },
      { new: true }
    );
    if (!acceptedOrder) {
      const latest = await Order.findById(order._id);
      if (latest?.partner && String(latest.partner) !== req.auth!.userId) {
        throw new ApiError(409, 'Order already accepted by another partner');
      }
      throw new ApiError(404, 'Order no longer available');
    }
    const fullOrder = await loadOrderForPartner(String(acceptedOrder._id));
    const payload = fullOrder ? serializeOrder(fullOrder) : { id: String(order._id) };
    const customer = fullOrder?.customer as unknown as { expoPushTokens?: string[] } | undefined;
    await sendPush(customer?.expoPushTokens, 'Driver assigned', `${partner.name} accepted ${acceptedOrder.orderNo}`, {
      orderId: String(acceptedOrder._id),
      orderNo: acceptedOrder.orderNo
    }).catch(() => undefined);
    emitOrderChanged(payload, String(acceptedOrder.customer), String(partner._id));
    emitPartnerQueueChanged();
    res.json({ order: payload });
  })
);

partnerRouter.post(
  '/orders/:orderId/reject',
  asyncRoute(async (req: AuthRequest, res) => {
    const order = await loadOrderForPartner(String(req.params.orderId));
    if (!order) throw new ApiError(404, 'Order not found');
    const offeredPartnerIds = ((order.offeredPartnerIds ?? []) as unknown[]).map(idOf);
    if (!offeredPartnerIds.includes(req.auth!.userId)) {
      throw new ApiError(404, 'Order no longer available');
    }
    await rejectDriverOffer(String(order._id), req.auth!.userId);
    const latest = await loadOrderForPartner(String(order._id));
    res.json({ order: latest ? serializeOrder(latest) : serializeOrder(order), rejected: true });
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
    if (body.status === 'picked_up') {
      const vehicle = await Vehicle.findById(order.vehicle);
      const arrivedPickupAt = orderTimelineTime(order, 'arrived_pickup');
      const pickedUpAt = orderTimelineTime(order, 'picked_up') ?? Date.now();
      if (vehicle && arrivedPickupAt) {
        order.set(
          'fare',
          applyWaitingChargeToFare({
            fare: order.fare,
            distanceKm: order.distanceKm,
            vehicle,
            waitingMinutes: (pickedUpAt - arrivedPickupAt) / 60000
          })
        );
      }
    }
    await order.save();

    if (body.status === 'delivered') {
      const settlement = calculateDeliverySettlement(order);
      order.set('settlement', settlement);
      if (order.paymentMode === 'cash' || order.paymentProvider === 'cash') {
        order.paymentStatus = 'paid';
      }
      await order.save();

      const isCashOrder = order.paymentMode === 'cash' || order.paymentProvider === 'cash';
      const platformCommission = Number((order.fare.platformCommission ?? 0).toFixed(2));
      const walletDelta = isCashOrder ? -platformCommission : settlement.partnerCredit;
      await User.updateOne(
        { _id: req.auth!.userId },
        {
          $inc: {
            'partnerProfile.walletBalance': walletDelta,
            'partnerProfile.weeklyOrders': 1
          }
        }
      );
      if (isCashOrder) {
        if (platformCommission > 0) {
          await WalletLedger.create({
            user: req.auth!.userId,
            order: order._id,
            amount: platformCommission,
            kind: 'debit',
            bucket: 'cash',
            title: `Indiery commission ${order.orderNo}`,
            reference: order.orderNo,
            settled: true
          });
        }
      } else {
        await WalletLedger.create({
          user: req.auth!.userId,
          order: order._id,
          amount: settlement.partnerCredit,
          kind: 'credit',
          bucket: 'cash',
          title: settlement.delayed ? `Order ${order.orderNo} delayed payout` : `Order ${order.orderNo} on-time payout`,
          reference: order.orderNo
        });
      }

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
  '/wallet/topup',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = WalletTopupSchema.parse(req.body);
    const partner = await loadPartner(req.auth!.userId);
    const referenceNo = `PARTNER-WALLET-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const paymentIntent = await createPaymentIntent({
      orderNo: referenceNo,
      amount: body.amount,
      paymentMode: body.paymentMode
    });
    await WalletLedger.create({
      user: partner._id,
      amount: body.amount,
      kind: 'credit',
      bucket: 'cash',
      title: 'Partner wallet top-up pending',
      reference: paymentIntent.reference,
      settled: false
    });
    res.status(201).json({ user: serializeUser(partner), paymentIntent });
  })
);

partnerRouter.post(
  '/wallet/topup/verify',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = RazorpayVerifySchema.parse(req.body);
    const valid = verifyRazorpayPaymentSignature(body);
    if (!valid) throw new ApiError(400, 'Invalid payment signature');
    const settledLedger = await WalletLedger.findOneAndUpdate(
      {
        user: req.auth!.userId,
        reference: body.razorpayOrderId,
        kind: 'credit',
        bucket: 'cash',
        settled: false
      },
      {
        title: 'Partner wallet top-up',
        settled: true
      },
      { new: true }
    );
    if (settledLedger) {
      await User.updateOne({ _id: req.auth!.userId }, { $inc: { 'partnerProfile.walletBalance': settledLedger.amount } });
    } else {
      const ledger = await WalletLedger.findOne({
        user: req.auth!.userId,
        reference: body.razorpayOrderId,
        kind: 'credit',
        bucket: 'cash'
      });
      if (!ledger) throw new ApiError(404, 'Partner wallet top-up not found');
    }
    const partner = await loadPartner(req.auth!.userId);
    res.json({ user: serializeUser(partner) });
  })
);

partnerRouter.post(
  '/kyc/:documentKey',
  asyncRoute(async (req: AuthRequest, res) => {
    const key = z.enum(['selfie', 'pan', 'aadhaar', 'drivingLicence', 'rc', 'insurance', 'bank']).parse(String(req.params.documentKey));
    const body = z
      .object({
        photoUrl: z.string().url().optional(),
        bankDetails: z
          .object({
            accountHolder: z.string().trim().min(2).max(80),
            accountNumber: z.string().trim().regex(/^\d{9,18}$/),
            ifsc: z.string().trim().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i)
          })
          .optional()
      })
      .parse(req.body ?? {});
    const partner = await loadPartner(req.auth!.userId);
    if (key === 'bank') {
      if (!body.bankDetails) throw new ApiError(400, 'Bank account details are required');
      const accountNumber = body.bankDetails.accountNumber.replace(/\D/g, '');
      const last4 = accountNumber.slice(-4);
      partner.set('partnerProfile.bankDetails', {
        accountHolder: body.bankDetails.accountHolder.trim(),
        accountNumberMasked: `XXXX${last4}`,
        accountNumberLast4: last4,
        ifsc: body.bankDetails.ifsc.trim().toUpperCase()
      });
    } else if (!body.photoUrl) {
      throw new ApiError(400, 'Document photo is required');
    }
    partner.set(`partnerProfile.docs.${key}`, true);
    if (body.photoUrl) partner.set(`partnerProfile.docUrls.${key}`, body.photoUrl);
    partner.set('partnerProfile.kycStatus', 'pending');
    await partner.save();
    res.json({ user: serializeUser(partner) });
  })
);
