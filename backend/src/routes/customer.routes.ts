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
import { resolveRouteMetrics } from '../services/maps.service';
import { createFareQuote, verifyFareQuote } from '../services/fare-quote.service';
import { createPaymentIntent, verifyRazorpayPaymentSignature } from '../services/payment.service';
import { hashOtp, makeTripOtp } from '../services/otp.service';
import { createTimeline, setOrderStatusTimeline } from '../services/timeline.service';
import { serializeOrder, serializeUser, serializeVehicle } from '../services/serialize.service';
import { emitOrderChanged, emitPartnerQueueChanged } from '../realtime/socket';
import { initialsFromName } from '../services/profile.service';
import { offerOrderToNextDrivers } from '../services/order-offers.service';
import { isExpoPushToken, registerPushToken, sendPush, unregisterPushToken } from '../services/notification.service';
import { createTrackingToken } from '../services/tracking-link.service';
import { calculateCustomerCoinDebit, customerCanPlaceOrder } from '../services/customer-coins.service';
import { calculateCancellationPayment, calculateCustomerCancellation } from '../services/cancellation.service';

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
  quoteId: z.string().min(20).optional(),
  pickupContactName: z.string().optional(),
  pickupContactPhone: z.string().optional(),
  dropContactName: z.string().optional(),
  dropContactPhone: z.string().optional(),
  goodsType: z.string().min(2).default('General goods'),
  paymentMode: z.enum(['upi', 'cash', 'wallet']).default('upi')
});

const WalletTopupSchema = z.object({
  amount: z.coerce.number().min(1).max(20000),
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

async function debitCustomerCoinsToLimit(input: {
  userId: string | Types.ObjectId;
  orderId: string | Types.ObjectId;
  orderNo: string;
  amount: number;
  title: string;
}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const customer = await User.findById(input.userId).select('customerProfile.coins');
    if (!customer) throw new ApiError(404, 'Customer not found');
    const currentCoins = customer.customerProfile?.coins ?? 0;
    const debit = calculateCustomerCoinDebit(currentCoins, input.amount);
    if (debit.amount <= 0) return 0;

    const result = await User.updateOne(
      { _id: customer._id, 'customerProfile.coins': currentCoins },
      { $inc: { 'customerProfile.coins': -debit.amount } }
    );
    if (result.modifiedCount !== 1) continue;

    await addCoinLedger({
      userId: customer._id,
      orderId: input.orderId,
      amount: debit.amount,
      kind: 'debit',
      title: input.title,
      reference: input.orderNo
    });
    return debit.amount;
  }

  throw new ApiError(409, 'Coin balance changed. Please retry the cancellation.');
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
    const [user, vehicles, orders, wallet] = await Promise.all([
      User.findById(req.auth!.userId),
      Vehicle.find({ active: true, code: { $in: customerVehicleCodes } }).sort({ capacityKg: 1 }),
      Order.find({ customer: req.auth!.userId })
        .sort({ createdAt: -1 })
        .limit(40)
        .populate('vehicle')
        .populate('partner'),
      getCustomerWallet(req.auth!.userId)
    ]);
    if (!user) throw new ApiError(404, 'Customer not found');
    const activeOrders = orders.filter((order) => !['delivered', 'cancelled'].includes(order.status));
    const activeOrder = activeOrders[0];
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
    const [user, vehicle, requiredVehicle, routeMetrics] = await Promise.all([
      User.findById(req.auth!.userId),
      Vehicle.findById(body.vehicleId),
      customerVehicleForWeight(body.weightKg),
      resolveRouteMetrics(body)
    ]);
    if (!user || !vehicle) throw new ApiError(404, 'Customer or vehicle not found');
    if (!customerCanPlaceOrder(user.customerProfile?.coins ?? 0)) {
      throw new ApiError(403, 'Recharge Indiery Coins before placing another order');
    }
    assertVehicleMatchesWeight(vehicle, requiredVehicle, body.weightKg);
    const fare = estimateFare({
      pickup: body.pickup,
      drop: body.drop,
      vehicle,
      coins: body.coins,
      customerCoins: user.customerProfile?.coins ?? 0,
      weightKg: body.weightKg,
      distanceKm: routeMetrics.distanceKm,
      routeDurationMinutes: routeMetrics.durationMinutes
    });
    const quoteId = createFareQuote(req.auth!.userId, body, routeMetrics);
    res.json({ fare, vehicle: serializeVehicle(vehicle), quoteId });
  })
);

customerRouter.post(
  '/orders',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = CreateOrderSchema.parse(req.body);
    const routeMetricsPromise = body.quoteId
      ? Promise.resolve(verifyFareQuote(body.quoteId, req.auth!.userId, body))
      : resolveRouteMetrics(body);
    const [user, vehicle, requiredVehicle, routeMetrics] = await Promise.all([
      User.findById(req.auth!.userId),
      Vehicle.findById(body.vehicleId),
      customerVehicleForWeight(body.weightKg),
      routeMetricsPromise
    ]);
    if (!user || !vehicle) throw new ApiError(404, 'Customer or vehicle not found');
    if (!customerCanPlaceOrder(user.customerProfile?.coins ?? 0)) {
      throw new ApiError(403, 'Recharge Indiery Coins before placing another order');
    }
    assertVehicleMatchesWeight(vehicle, requiredVehicle, body.weightKg);

    const fare = estimateFare({
      pickup: body.pickup,
      drop: body.drop,
      vehicle,
      coins: body.coins,
      customerCoins: user.customerProfile?.coins ?? 0,
      weightKg: body.weightKg,
      distanceKm: routeMetrics.distanceKm,
      routeDurationMinutes: routeMetrics.durationMinutes
    });
    if (body.paymentMode === 'wallet' && (user.customerProfile?.walletBalance ?? 0) < fare.total) {
      throw new ApiError(400, 'Insufficient wallet balance');
    }
    const pickupOtp = makeTripOtp();
    const dropOtp = makeTripOtp();
    const otpHashesPromise = Promise.all([
      hashOtp(pickupOtp),
      hashOtp(dropOtp)
    ]);
    const orderNo = await nextOrderNo();
    const [paymentIntent, [pickupOtpHash, dropOtpHash]] = await Promise.all([
      createPaymentIntent({
        orderNo,
        amount: fare.total,
        paymentMode: body.paymentMode
      }),
      otpHashesPromise
    ]);

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
        pickupOtpHash,
        dropOtpHash
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
    res.status(201).json({
      order: customerPayload,
      paymentIntent,
      tripOtp: {
        pickup: pickupOtp,
        drop: dropOtp
      }
    });
    if (paymentIntent.provider === 'cash' || paymentIntent.status === 'paid') {
      void offerOrderToNextDrivers(order._id, { reason: 'new' }).catch((error) => {
        console.error('Unable to dispatch newly created order', error);
      });
    }
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
  '/orders/:orderId/tracking-link',
  asyncRoute(async (req: AuthRequest, res) => {
    const order = await Order.findOne({ _id: String(req.params.orderId), customer: req.auth!.userId })
      .select('_id orderNo status');
    if (!order) throw new ApiError(404, 'Order not found');
    if (['delivered', 'cancelled'].includes(order.status)) {
      throw new ApiError(409, 'Only active orders can be shared for live tracking');
    }

    const token = createTrackingToken(String(order._id), order.orderNo);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ trackingPath: `/t/${encodeURIComponent(token)}` });
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
    const customer = fullOrder?.customer as unknown as { expoPushTokens?: string[] } | undefined;
    res.json({ order: customerPayload });
    void sendPush(
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
    ).catch((error) => {
      console.error('Unable to send payment-received notification', error);
    });
    void offerOrderToNextDrivers(order._id, { reason: 'payment' }).catch((error) => {
      console.error('Unable to dispatch paid order', error);
    });
  })
);

customerRouter.post(
  '/orders/:orderId/cancel',
  asyncRoute(async (req: AuthRequest, res) => {
    const order = await Order.findById(String(req.params.orderId));
    if (!order || String(order.customer) !== req.auth!.userId) throw new ApiError(404, 'Order not found');
    const cancelledAt = new Date();
    const pickedUpAt = order.timeline?.find((item) => item.key === 'picked_up')?.at;
    const cancellation = calculateCustomerCancellation({
      status: order.status,
      total: order.fare.total,
      pickedUpAt: pickedUpAt ?? undefined,
      now: cancelledAt
    });
    if (!cancellation.allowed) throw new ApiError(400, cancellation.reason);

    const prepaid = order.paymentStatus === 'paid' && order.paymentMode !== 'cash';
    const cancellationPayment = calculateCancellationPayment({
      cancellationCharge: cancellation.charge,
      currentOrderTotal: order.fare.total,
      waitingCharge: order.fare.waitingCharge ?? 0,
      prepaid
    });
    const coinRefundAmount = cancellationPayment.refundAmount;
    const shouldRefundCoins = order.fare.coins > 0 && (order.paymentStatus === 'paid' || order.paymentMode === 'cash');

    const cancellationReason = String(req.body?.reason || 'Cancelled by customer');
    const cancelledTimeline = createTimeline('cancelled', order.timeline ?? []);
    const customerCancellation = {
      policy: cancellation.policy,
      charge: cancellation.charge,
      refundAmount: coinRefundAmount,
      partnerCredit: cancellation.partnerCredit,
      platformCommission: cancellation.platformCommission,
      coinDebit: 0,
      pickedUpElapsedMinutes: cancellation.pickedUpElapsedMinutes,
      cancelledAt
    };
    const transitionValues: Record<string, unknown> = {
      status: 'cancelled',
      cancellationReason,
      timeline: cancelledTimeline,
      customerCancellation
    };
    if (cancellation.partnerCredit > 0) {
      transitionValues.settlement = {
        delayed: false,
        partnerCredit: cancellation.partnerCredit,
        driverPenalty: 0,
        platformPenalty: 0,
        reserveReleasedTo: 'partner',
        settledAt: cancelledAt
      };
    }
    if (coinRefundAmount > 0) transitionValues.paymentStatus = 'refunded';
    const transition = await Order.updateOne(
      { _id: order._id, customer: req.auth!.userId, status: order.status },
      { $set: transitionValues },
      { runValidators: true }
    );
    if (transition.modifiedCount !== 1) throw new ApiError(409, 'Order status changed. Please try again.');
    order.status = 'cancelled';
    order.cancellationReason = cancellationReason;
    order.set('timeline', cancelledTimeline);
    order.set('customerCancellation', customerCancellation);
    if (coinRefundAmount > 0) order.paymentStatus = 'refunded';

    if (coinRefundAmount > 0) {
      await User.updateOne(
        { _id: req.auth!.userId },
        { $inc: { 'customerProfile.coins': coinRefundAmount } }
      );
      await addCoinLedger({
        userId: req.auth!.userId,
        orderId: order._id,
        amount: coinRefundAmount,
        kind: 'credit',
        title: `Cancellation refund ${order.orderNo}`,
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

    let cancellationCoinDebit = 0;
    if (cancellationPayment.coinCharge > 0) {
      cancellationCoinDebit = await debitCustomerCoinsToLimit({
        userId: req.auth!.userId,
        orderId: order._id,
        orderNo: order.orderNo,
        amount: cancellationPayment.coinCharge,
        title: `Cancellation charge ${order.orderNo}`
      });
      await Order.updateOne(
        { _id: order._id },
        { $set: { 'customerCancellation.coinDebit': cancellationCoinDebit } }
      );
    }

    if (order.partner && cancellation.partnerCredit > 0) {
      await User.updateOne(
        { _id: order.partner },
        { $inc: { 'partnerProfile.walletBalance': cancellation.partnerCredit } }
      );
      await WalletLedger.create({
        user: order.partner,
        order: order._id,
        amount: cancellation.partnerCredit,
        kind: 'credit',
        bucket: 'cash',
        title: `Customer cancellation payout ${order.orderNo}`,
        reference: order.orderNo,
        settled: true
      });
    }

    const pushRecipientIds = order.partner
      ? [String(order.partner)]
      : ((order.offeredPartnerIds ?? []) as unknown[]).map(String);
    const chargeText = cancellation.charge > 0
      ? ` A 10% cancellation charge of INR ${cancellation.charge} was applied.`
      : ' No cancellation charge was applied.';
    const refundText = coinRefundAmount > 0
      ? ` INR ${coinRefundAmount} was added to Indiery Coins.`
      : cancellationCoinDebit > 0
        ? ` INR ${cancellationCoinDebit} was debited from Indiery Coins.`
        : shouldRefundCoins
          ? ' Coins used on this order were returned.'
          : '';
    const [fullOrder, wallet, customer] = await Promise.all([
      populatedOrder(order._id),
      getCustomerWallet(req.auth!.userId),
      User.findById(req.auth!.userId)
    ]);
    emitOrderChanged(
      fullOrder ? serializeOrder(fullOrder) : { id: String(order._id), status: 'cancelled' },
      req.auth!.userId,
      order.partner ? String(order.partner) : undefined
    );
    emitPartnerQueueChanged();
    res.json({
      order: fullOrder ? serializeOrder(fullOrder, { includeTripOtp: true }) : undefined,
      cancellationCharge: cancellation.charge,
      refundAmount: coinRefundAmount,
      coinDebit: cancellationCoinDebit,
      wallet,
      user: customer ? serializeUser(customer) : undefined
    });

    void (async () => {
      if (pushRecipientIds.length) {
        const recipients = await User.find({ _id: { $in: pushRecipientIds } }).select('expoPushTokens');
        await sendPush(
          recipients.flatMap((recipient) => recipient.expoPushTokens ?? []),
          'Order cancelled',
          `${order.orderNo} is no longer available`,
          {
            event: 'order_cancelled',
            role: 'partner',
            screen: 'dashboard',
            orderId: String(order._id),
            orderNo: order.orderNo,
            status: 'cancelled'
          },
          {
            ttl: 3600,
            collapseId: `order-${String(order._id)}-customer-cancel-${Date.now()}`,
            channelId: 'driver-orders',
            priority: 'high'
          }
        );
      }
      const customerForPush = await User.findById(req.auth!.userId).select('expoPushTokens');
      await sendPush(
        customerForPush?.expoPushTokens,
        'Order cancelled',
        `${order.orderNo} has been cancelled.${chargeText}${refundText}`,
        {
          event: 'customer_order_cancelled',
          role: 'customer',
          screen: 'orders',
          orderId: String(order._id),
          orderNo: order.orderNo,
          status: 'cancelled',
          paymentStatus: order.paymentStatus
        },
        { ttl: 3600, collapseId: `order-${String(order._id)}-cancel-confirm-${Date.now()}` }
      );
    })().catch((error) => {
      console.error('Unable to send order-cancelled notifications', error);
    });
  })
);

customerRouter.post(
  '/push-token',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = z.object({ token: z.string().refine(isExpoPushToken, 'Invalid Expo push token') }).parse(req.body);
    const user = await registerPushToken(req.auth!.userId, body.token);
    if (!user) throw new ApiError(404, 'Customer not found');
    res.json({ user: serializeUser(user) });
  })
);

customerRouter.delete(
  '/push-token',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = z.object({ token: z.string().refine(isExpoPushToken, 'Invalid Expo push token') }).parse(req.body);
    const user = await unregisterPushToken(req.auth!.userId, body.token);
    if (!user) throw new ApiError(404, 'Customer not found');
    res.json({ ok: true });
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
  '/wallet/coins/topup',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = WalletTopupSchema.parse(req.body);
    const user = await User.findById(req.auth!.userId);
    if (!user) throw new ApiError(404, 'Customer not found');
    const referenceNo = `COINS-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const paymentIntent = await createPaymentIntent({
      orderNo: referenceNo,
      amount: body.amount,
      paymentMode: body.paymentMode
    });
    await WalletLedger.create({
      user: user._id,
      amount: body.amount,
      kind: 'credit',
      bucket: 'coins',
      title: 'Indiery Coins recharge pending',
      reference: paymentIntent.reference,
      settled: false
    });
    const wallet = await getCustomerWallet(user._id);
    res.status(201).json({ wallet, paymentIntent });
  })
);

customerRouter.post(
  '/wallet/coins/topup/verify',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = RazorpayVerifySchema.parse(req.body);
    const valid = verifyRazorpayPaymentSignature(body);
    if (!valid) throw new ApiError(400, 'Invalid payment signature');
    const settledLedger = await WalletLedger.findOneAndUpdate(
      {
        user: req.auth!.userId,
        reference: body.razorpayOrderId,
        kind: 'credit',
        bucket: 'coins',
        settled: false
      },
      {
        title: 'Indiery Coins recharge',
        settled: true
      },
      { new: true }
    );
    if (settledLedger) {
      await User.updateOne(
        { _id: req.auth!.userId },
        { $inc: { 'customerProfile.coins': settledLedger.amount } }
      );
    } else {
      const ledger = await WalletLedger.findOne({
        user: req.auth!.userId,
        reference: body.razorpayOrderId,
        kind: 'credit',
        bucket: 'coins'
      });
      if (!ledger) throw new ApiError(404, 'Indiery Coins recharge not found');
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
