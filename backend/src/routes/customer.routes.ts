import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { ApiError, asyncRoute } from '../middleware/error';
import { User } from '../models/User';
import { Vehicle, type VehicleDocument } from '../models/Vehicle';
import { Order } from '../models/Order';
import { Counter } from '../models/Counter';
import { WalletLedger, type WalletLedgerDocument } from '../models/WalletLedger';
import { estimateFare } from '../services/fare.service';
import { resolveDistanceKm } from '../services/maps.service';
import { createPaymentIntent, verifyRazorpayPaymentSignature } from '../services/payment.service';
import { hashOtp, makeTripOtp } from '../services/otp.service';
import { createTimeline, setOrderStatusTimeline } from '../services/timeline.service';
import { serializeOrder, serializeUser, serializeVehicle } from '../services/serialize.service';
import { emitOrderChanged, emitPartnerQueueChanged } from '../realtime/socket';
import { initialsFromName } from '../services/profile.service';
import { offerOrderToNextDrivers } from '../services/order-offers.service';

export const customerRouter = Router();

customerRouter.use(requireAuth(['customer']));

const customerVehicleCodes = ['bike', 'loader90', 'mini500', 'mini750'];
const customerVehicleMaxWeight: Record<string, number> = {
  bike: 20,
  loader90: 90,
  mini500: 500,
  mini750: 750
};
const ExtraStopSchema = z.object({
  label: z.string().trim().min(2),
  address: z.string().trim().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  contactName: z.string().trim().optional(),
  contactPhone: z.string().trim().optional()
});

const EstimateSchema = z.object({
  pickup: z.string().min(2),
  drop: z.string().min(2),
  vehicleId: z.string().min(1),
  coins: z.coerce.number().min(0).default(0),
  weightKg: z.coerce.number().min(0.1).default(1),
  extraStops: z.array(ExtraStopSchema).max(3).default([]),
  pickupLat: z.coerce.number().optional(),
  pickupLng: z.coerce.number().optional(),
  dropLat: z.coerce.number().optional(),
  dropLng: z.coerce.number().optional()
});

const CreateOrderSchema = EstimateSchema.extend({
  pickupContactName: z.string().optional(),
  pickupContactPhone: z.string().optional(),
  dropContactName: z.string().optional(),
  dropContactPhone: z.string().optional(),
  goodsType: z.string().min(2).default('General goods'),
  paymentMode: z.enum(['upi', 'cash', 'wallet']).default('upi')
});

const WalletTopupSchema = z.object({
  amount: z.coerce.number().min(10).max(20000),
  paymentMode: z.enum(['upi']).default('upi')
});

const RazorpayVerifySchema = z.object({
  razorpayOrderId: z.string().min(6),
  razorpayPaymentId: z.string().min(6),
  razorpaySignature: z.string().min(20)
});

const ProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120).optional().or(z.literal('')),
  city: z.string().trim().min(2).max(80)
});

const SavedAddressSchema = z.object({
  label: z.string().trim().min(2).max(80),
  address: z.string().trim().min(3).max(240),
  addressLine: z.string().trim().max(160).optional().or(z.literal('')),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  type: z.enum(['home', 'work', 'other']).default('other')
});

async function nextOrderNo() {
  const counter = await Counter.findOneAndUpdate(
    { key: 'order' },
    { $inc: { value: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return `IND-${counter.value}`;
}

async function populatedOrder(orderId: Types.ObjectId | string) {
  return Order.findById(orderId)
    .populate('vehicle')
    .populate('partner')
    .populate('customer');
}

function serializeLedgerItem(item: WalletLedgerDocument) {
  return {
    id: String(item._id),
    amount: item.amount,
    kind: item.kind,
    title: item.title,
    reference: item.reference,
    bucket: item.bucket ?? 'cash',
    settled: item.settled,
    createdAt: item.createdAt
  };
}

async function getCustomerWallet(userId: string | Types.ObjectId) {
  const [user, ledger, coinLedger] = await Promise.all([
    User.findById(userId),
    WalletLedger.find({ user: userId, bucket: 'cash' }).sort({ createdAt: -1 }).limit(30),
    WalletLedger.find({ user: userId, bucket: 'coins' }).sort({ createdAt: -1 }).limit(20)
  ]);
  if (!user) throw new ApiError(404, 'Customer not found');
  return {
    balance: user.customerProfile?.walletBalance ?? 0,
    coins: user.customerProfile?.coins ?? 0,
    ledger: ledger.map((item) => serializeLedgerItem(item)!),
    coinLedger: coinLedger.map((item) => serializeLedgerItem(item)!)
  };
}

async function addCoinLedger(input: {
  userId: string | Types.ObjectId;
  orderId?: string | Types.ObjectId;
  amount: number;
  kind: 'credit' | 'debit';
  title: string;
  reference?: string;
}) {
  if (input.amount <= 0) return;
  await WalletLedger.create({
    user: input.userId,
    order: input.orderId,
    amount: input.amount,
    kind: input.kind,
    bucket: 'coins',
    title: input.title,
    reference: input.reference,
    settled: true
  });
}

async function creditCustomerWallet(input: {
  userId: string | Types.ObjectId;
  orderId?: string | Types.ObjectId;
  amount: number;
  title: string;
  reference?: string;
}) {
  if (input.amount <= 0) return;
  await User.updateOne({ _id: input.userId }, { $inc: { 'customerProfile.walletBalance': input.amount } });
  await WalletLedger.create({
    user: input.userId,
    order: input.orderId,
    amount: input.amount,
    kind: 'credit',
    bucket: 'cash',
    title: input.title,
    reference: input.reference,
    settled: true
  });
}

async function debitCustomerWallet(input: {
  userId: string | Types.ObjectId;
  orderId?: string | Types.ObjectId;
  amount: number;
  title: string;
  reference?: string;
}) {
  if (input.amount <= 0) return;
  const user = await User.findOneAndUpdate(
    { _id: input.userId, 'customerProfile.walletBalance': { $gte: input.amount } },
    { $inc: { 'customerProfile.walletBalance': -input.amount } },
    { new: true }
  );
  if (!user) throw new ApiError(400, 'Insufficient wallet balance');
  await WalletLedger.create({
    user: input.userId,
    order: input.orderId,
    amount: input.amount,
    kind: 'debit',
    bucket: 'cash',
    title: input.title,
    reference: input.reference,
    settled: true
  });
}

async function customerVehicleForWeight(weightKg: number) {
  const requiredCode =
    weightKg <= 20
      ? 'bike'
      : weightKg <= 90
        ? 'loader90'
        : weightKg <= 500
          ? 'mini500'
          : weightKg <= 750
            ? 'mini750'
            : undefined;
  if (!requiredCode) return undefined;
  return Vehicle.findOne({ active: true, code: requiredCode });
}

function assertVehicleMatchesWeight(vehicle: VehicleDocument | null, requiredVehicle: VehicleDocument | null | undefined, weightKg: number) {
  if (!vehicle) throw new ApiError(404, 'Vehicle not found');
  if (!customerVehicleCodes.includes(vehicle.code)) throw new ApiError(400, 'This vehicle is not available for customer booking');
  if (!requiredVehicle) throw new ApiError(400, 'No customer vehicle is available for this weight');
  const maxWeight = customerVehicleMaxWeight[vehicle.code] ?? vehicle.capacityKg;
  if (weightKg > maxWeight) {
    throw new ApiError(400, `Use ${requiredVehicle.shortName} for this weight`);
  }
}

customerRouter.get(
  '/bootstrap',
  asyncRoute(async (req: AuthRequest, res) => {
    const user = await User.findById(req.auth!.userId);
    if (!user) throw new ApiError(404, 'Customer not found');
    const vehicles = await Vehicle.find({ active: true, code: { $in: customerVehicleCodes } }).sort({ capacityKg: 1 });
    const orders = await Order.find({ customer: user._id })
      .sort({ createdAt: -1 })
      .limit(40)
      .populate('vehicle')
      .populate('partner')
      .populate('customer');
    const activeOrders = orders.filter((order) => !['delivered', 'cancelled'].includes(order.status));
    const activeOrder = activeOrders[0];
    const wallet = await getCustomerWallet(user._id);
    res.json({
      user: serializeUser(user),
      wallet,
      vehicles: vehicles.map(serializeVehicle),
      activeOrder: activeOrder ? serializeOrder(activeOrder, { includeTripOtp: true }) : undefined,
      activeOrders: activeOrders.map((order) => serializeOrder(order, { includeTripOtp: true })),
      orders: orders.map((order) => serializeOrder(order, { includeTripOtp: true }))
    });
  })
);

customerRouter.patch(
  '/profile',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = ProfileSchema.parse(req.body);
    const user = await User.findOneAndUpdate(
      { _id: req.auth!.userId, role: 'customer' },
      {
        name: body.name,
        initials: initialsFromName(body.name),
        email: body.email || undefined,
        city: body.city
      },
      { new: true }
    );
    if (!user) throw new ApiError(404, 'Customer not found');
    res.json({ user: serializeUser(user) });
  })
);

customerRouter.post(
  '/saved-addresses',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = SavedAddressSchema.parse(req.body);
    const savedAddress = {
      id: `addr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: body.label,
      address: body.address,
      addressLine: body.addressLine || '',
      lat: body.lat,
      lng: body.lng,
      type: body.type
    };
    const user = await User.findOneAndUpdate(
      { _id: req.auth!.userId, role: 'customer' },
      { $push: { 'customerProfile.savedAddresses': { $each: [savedAddress], $position: 0 } } },
      { new: true }
    );
    if (!user) throw new ApiError(404, 'Customer not found');
    res.status(201).json({ user: serializeUser(user), savedAddress });
  })
);

customerRouter.delete(
  '/saved-addresses/:addressId',
  asyncRoute(async (req: AuthRequest, res) => {
    const user = await User.findOneAndUpdate(
      { _id: req.auth!.userId, role: 'customer' },
      { $pull: { 'customerProfile.savedAddresses': { id: String(req.params.addressId) } } },
      { new: true }
    );
    if (!user) throw new ApiError(404, 'Customer not found');
    res.json({ user: serializeUser(user) });
  })
);

customerRouter.post(
  '/estimate',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = EstimateSchema.parse(req.body);
    const user = await User.findById(req.auth!.userId);
    const vehicle = await Vehicle.findById(body.vehicleId);
    if (!user || !vehicle) throw new ApiError(404, 'Customer or vehicle not found');
    const requiredVehicle = await customerVehicleForWeight(body.weightKg);
    assertVehicleMatchesWeight(vehicle, requiredVehicle, body.weightKg);
    const distanceKm = await resolveDistanceKm(body);
    const fare = estimateFare({
      pickup: body.pickup,
      drop: body.drop,
      vehicle,
      coins: body.coins,
      customerCoins: user.customerProfile?.coins ?? 0,
      weightKg: body.weightKg,
      distanceKm
    });
    res.json({ fare, vehicle: serializeVehicle(vehicle) });
  })
);

customerRouter.post(
  '/orders',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = CreateOrderSchema.parse(req.body);
    const user = await User.findById(req.auth!.userId);
    const vehicle = await Vehicle.findById(body.vehicleId);
    if (!user || !vehicle) throw new ApiError(404, 'Customer or vehicle not found');
    const requiredVehicle = await customerVehicleForWeight(body.weightKg);
    assertVehicleMatchesWeight(vehicle, requiredVehicle, body.weightKg);

    const distanceKm = await resolveDistanceKm(body);
    const fare = estimateFare({
      pickup: body.pickup,
      drop: body.drop,
      vehicle,
      coins: body.coins,
      customerCoins: user.customerProfile?.coins ?? 0,
      weightKg: body.weightKg,
      distanceKm
    });
    if (body.paymentMode === 'wallet' && (user.customerProfile?.walletBalance ?? 0) < fare.total) {
      throw new ApiError(400, 'Insufficient wallet balance');
    }
    const orderNo = await nextOrderNo();
    const paymentIntent = await createPaymentIntent({
      orderNo,
      amount: fare.total,
      paymentMode: body.paymentMode
    });
    const pickupOtp = makeTripOtp();
    const dropOtp = makeTripOtp();

    const order = await Order.create({
      orderNo,
      customer: user._id,
      vehicle: vehicle._id,
      pickup: {
        label: body.pickup,
        address: body.pickup,
        lat: body.pickupLat,
        lng: body.pickupLng,
        contactName: body.pickupContactName,
        contactPhone: body.pickupContactPhone
      },
      extraStops: body.extraStops.map((stop) => ({
        label: stop.label,
        address: stop.address || stop.label,
        lat: stop.lat,
        lng: stop.lng,
        contactName: stop.contactName,
        contactPhone: stop.contactPhone
      })),
      drop: {
        label: body.drop,
        address: body.drop,
        lat: body.dropLat,
        lng: body.dropLng,
        contactName: body.dropContactName,
        contactPhone: body.dropContactPhone
      },
      goodsType: body.goodsType,
      weightKg: body.weightKg,
      distanceKm: fare.distanceKm,
      fare,
      paymentMode: body.paymentMode,
      paymentStatus: paymentIntent.status,
      paymentProvider: paymentIntent.provider,
      paymentReference: paymentIntent.reference,
      status: 'searching',
      etaMinutes: fare.etaMinutes,
      timeline: createTimeline('searching'),
      verification: {
        pickupOtp,
        dropOtp,
        pickupOtpHash: await hashOtp(pickupOtp),
        dropOtpHash: await hashOtp(dropOtp)
      }
    });

    if (paymentIntent.provider === 'wallet') {
      try {
        await debitCustomerWallet({
          userId: user._id,
          orderId: order._id,
          amount: fare.total,
          title: `Paid for ${order.orderNo}`,
          reference: order.orderNo
        });
      } catch (err) {
        order.paymentStatus = 'failed';
        order.status = 'cancelled';
        order.cancellationReason = 'Wallet payment failed';
        order.set('timeline', createTimeline('cancelled', order.timeline ?? []));
        await order.save();
        throw err;
      }
    }

    if (fare.coins > 0 && (paymentIntent.provider === 'cash' || paymentIntent.status === 'paid')) {
      await User.updateOne({ _id: user._id }, { $inc: { 'customerProfile.coins': -fare.coins } });
      await addCoinLedger({
        userId: user._id,
        orderId: order._id,
        amount: fare.coins,
        kind: 'debit',
        title: `Coins used ${order.orderNo}`,
        reference: order.orderNo
      });
    }

    const fullOrder = await populatedOrder(order._id);
    if (!fullOrder) throw new ApiError(500, 'Order could not be loaded');
    const payload = serializeOrder(fullOrder);
    const customerPayload = serializeOrder(fullOrder, { includeTripOtp: true });
    emitOrderChanged(payload, String(user._id));
    const dispatchPayload =
      paymentIntent.provider === 'cash' || paymentIntent.status === 'paid'
        ? await offerOrderToNextDrivers(order._id, { reason: 'new' })
        : undefined;
    res.status(201).json({
      order: dispatchPayload ? { ...dispatchPayload, tripOtp: customerPayload.tripOtp } : customerPayload,
      paymentIntent,
      tripOtp: {
        pickup: pickupOtp,
        drop: dropOtp
      }
    });
  })
);

customerRouter.get(
  '/orders',
  asyncRoute(async (req: AuthRequest, res) => {
    const orders = await Order.find({ customer: req.auth!.userId })
      .sort({ createdAt: -1 })
      .populate('vehicle')
      .populate('partner')
      .populate('customer');
    res.json({ orders: orders.map((order) => serializeOrder(order, { includeTripOtp: true })) });
  })
);

customerRouter.get(
  '/orders/:orderId',
  asyncRoute(async (req: AuthRequest, res) => {
    const order = await populatedOrder(String(req.params.orderId));
    if (!order || String(order.customer._id) !== req.auth!.userId) throw new ApiError(404, 'Order not found');
    res.json({ order: serializeOrder(order, { includeTripOtp: true }) });
  })
);

customerRouter.post(
  '/orders/:orderId/payment/verify',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = RazorpayVerifySchema.parse(req.body);
    const order = await Order.findOne({ _id: String(req.params.orderId), customer: req.auth!.userId });
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.paymentProvider !== 'razorpay') throw new ApiError(400, 'Order does not use Razorpay');
    if (order.paymentReference !== body.razorpayOrderId) throw new ApiError(400, 'Payment order mismatch');
    if (order.paymentStatus === 'paid') {
      const alreadyPaidOrder = await populatedOrder(order._id);
      return res.json({
        order: alreadyPaidOrder ? serializeOrder(alreadyPaidOrder, { includeTripOtp: true }) : { id: String(order._id) }
      });
    }
    const valid = verifyRazorpayPaymentSignature(body);
    if (!valid) throw new ApiError(400, 'Invalid payment signature');

    order.paymentStatus = 'paid';
    await order.save();
    if (order.fare.coins > 0) {
      await User.updateOne({ _id: req.auth!.userId }, { $inc: { 'customerProfile.coins': -order.fare.coins } });
      await addCoinLedger({
        userId: req.auth!.userId,
        orderId: order._id,
        amount: order.fare.coins,
        kind: 'debit',
        title: `Coins used ${order.orderNo}`,
        reference: order.orderNo
      });
    }
    const fullOrder = await populatedOrder(order._id);
    const payload = fullOrder ? serializeOrder(fullOrder) : { id: String(order._id) };
    const customerPayload = fullOrder ? serializeOrder(fullOrder, { includeTripOtp: true }) : { id: String(order._id), tripOtp: undefined };
    emitOrderChanged(payload, req.auth!.userId, order.partner ? String(order.partner) : undefined);
    const dispatchPayload = await offerOrderToNextDrivers(order._id, { reason: 'payment' });
    res.json({ order: dispatchPayload ? { ...dispatchPayload, tripOtp: customerPayload.tripOtp } : customerPayload });
  })
);

customerRouter.post(
  '/orders/:orderId/cancel',
  asyncRoute(async (req: AuthRequest, res) => {
    const order = await Order.findById(String(req.params.orderId));
    if (!order || String(order.customer) !== req.auth!.userId) throw new ApiError(404, 'Order not found');
    if (['picked_up', 'in_transit', 'delivered'].includes(order.status)) {
      throw new ApiError(400, 'Order cannot be cancelled after pickup');
    }
    order.status = 'cancelled';
    order.cancellationReason = String(req.body?.reason || 'Cancelled by customer');
    order.set('timeline', createTimeline('cancelled', order.timeline ?? []));
    const walletRefundAmount = order.paymentStatus === 'paid' && order.paymentMode !== 'cash' ? order.fare.total : 0;
    const shouldRefundCoins = order.fare.coins > 0 && (order.paymentStatus === 'paid' || order.paymentMode === 'cash');
    if (walletRefundAmount > 0) order.paymentStatus = 'refunded';
    await order.save();
    if (walletRefundAmount > 0) {
      await creditCustomerWallet({
        userId: req.auth!.userId,
        orderId: order._id,
        amount: walletRefundAmount,
        title: `Wallet refund ${order.orderNo}`,
        reference: order.orderNo
      });
    }
    if (shouldRefundCoins) {
      await User.updateOne({ _id: req.auth!.userId }, { $inc: { 'customerProfile.coins': order.fare.coins } });
      await addCoinLedger({
        userId: req.auth!.userId,
        orderId: order._id,
        amount: order.fare.coins,
        kind: 'credit',
        title: `Coins returned ${order.orderNo}`,
        reference: order.orderNo
      });
    }
    const fullOrder = await populatedOrder(order._id);
    emitOrderChanged(fullOrder ? serializeOrder(fullOrder) : { id: String(order._id) }, req.auth!.userId);
    emitPartnerQueueChanged();
    res.json({ order: fullOrder ? serializeOrder(fullOrder, { includeTripOtp: true }) : undefined });
  })
);

customerRouter.post(
  '/push-token',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = z.object({ token: z.string().min(8) }).parse(req.body);
    const user = await User.findByIdAndUpdate(
      req.auth!.userId,
      { $addToSet: { expoPushTokens: body.token } },
      { new: true }
    );
    if (!user) throw new ApiError(404, 'Customer not found');
    res.json({ user: serializeUser(user) });
  })
);

customerRouter.get(
  '/wallet',
  asyncRoute(async (req: AuthRequest, res) => {
    const user = await User.findById(req.auth!.userId);
    if (!user) throw new ApiError(404, 'Customer not found');
    const wallet = await getCustomerWallet(req.auth!.userId);
    res.json({ user: serializeUser(user), wallet });
  })
);

customerRouter.post(
  '/wallet/topup',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = WalletTopupSchema.parse(req.body);
    const user = await User.findById(req.auth!.userId);
    if (!user) throw new ApiError(404, 'Customer not found');
    const referenceNo = `WALLET-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const paymentIntent = await createPaymentIntent({
      orderNo: referenceNo,
      amount: body.amount,
      paymentMode: body.paymentMode
    });
    await WalletLedger.create({
      user: user._id,
      amount: body.amount,
      kind: 'credit',
      bucket: 'cash',
      title: 'Wallet top-up pending',
      reference: paymentIntent.reference,
      settled: false
    });
    const wallet = await getCustomerWallet(user._id);
    res.status(201).json({ wallet, paymentIntent });
  })
);

customerRouter.post(
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
        title: 'Wallet top-up',
        settled: true
      },
      { new: true }
    );
    if (settledLedger) {
      await User.updateOne({ _id: req.auth!.userId }, { $inc: { 'customerProfile.walletBalance': settledLedger.amount } });
    } else {
      const ledger = await WalletLedger.findOne({
        user: req.auth!.userId,
        reference: body.razorpayOrderId,
        kind: 'credit',
        bucket: 'cash'
      });
      if (!ledger) throw new ApiError(404, 'Wallet top-up not found');
    }
    const user = await User.findById(req.auth!.userId);
    if (!user) throw new ApiError(404, 'Customer not found');
    const wallet = await getCustomerWallet(req.auth!.userId);
    res.json({ user: serializeUser(user), wallet });
  })
);

customerRouter.post(
  '/wallet/coupon',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = z.object({ code: z.string().min(3) }).parse(req.body);
    const code = body.code.trim().toUpperCase();
    const coinsByCode: Record<string, number> = {
      FIRST50: 50,
      INDIERY100: 100
    };
    const coins = coinsByCode[code];
    if (!coins) throw new ApiError(400, 'Invalid coupon');
    const existingCouponLedger = await WalletLedger.findOne({
      user: req.auth!.userId,
      bucket: 'coins',
      kind: 'credit',
      reference: code,
      title: `Coupon ${code}`
    });
    if (existingCouponLedger) {
      const user = await User.findByIdAndUpdate(
        req.auth!.userId,
        { $addToSet: { 'customerProfile.usedCoupons': code } },
        { new: true }
      );
      if (!user) throw new ApiError(404, 'Customer not found');
      return res.json({ user: serializeUser(user), addedCoins: 0, alreadyApplied: true });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.auth!.userId, 'customerProfile.usedCoupons': { $ne: code } },
      {
        $inc: { 'customerProfile.coins': coins },
        $addToSet: { 'customerProfile.usedCoupons': code }
      },
      { new: true }
    );
    if (!user) {
      const currentUser = await User.findById(req.auth!.userId);
      if (!currentUser) throw new ApiError(404, 'Customer not found');
      return res.json({ user: serializeUser(currentUser), addedCoins: 0, alreadyApplied: true });
    }
    await addCoinLedger({
      userId: req.auth!.userId,
      amount: coins,
      kind: 'credit',
      title: `Coupon ${code}`,
      reference: code
    });
    res.json({ user: serializeUser(user), addedCoins: coins, alreadyApplied: false });
  })
);
