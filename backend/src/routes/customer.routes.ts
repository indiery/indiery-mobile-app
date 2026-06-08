import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { ApiError, asyncRoute } from '../middleware/error';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';
import { Order } from '../models/Order';
import { Counter } from '../models/Counter';
import { WalletLedger } from '../models/WalletLedger';
import { estimateFare } from '../services/fare.service';
import { resolveDistanceKm } from '../services/maps.service';
import { createPaymentIntent } from '../services/payment.service';
import { hashOtp, makeTripOtp } from '../services/otp.service';
import { sendPush, sendSms } from '../services/notification.service';
import { createTimeline, setOrderStatusTimeline } from '../services/timeline.service';
import { serializeOrder, serializeUser, serializeVehicle } from '../services/serialize.service';
import { emitOrderChanged, emitPartnerQueueChanged } from '../realtime/socket';

export const customerRouter = Router();

customerRouter.use(requireAuth(['customer']));

const EstimateSchema = z.object({
  pickup: z.string().min(2),
  drop: z.string().min(2),
  vehicleId: z.string().min(1),
  coins: z.coerce.number().min(0).default(0),
  weightKg: z.coerce.number().min(0.1).default(1),
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
  paymentMode: z.enum(['upi', 'card', 'wallet', 'netbanking', 'cash']).default('upi')
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

customerRouter.get(
  '/bootstrap',
  asyncRoute(async (req: AuthRequest, res) => {
    const user = await User.findById(req.auth!.userId);
    if (!user) throw new ApiError(404, 'Customer not found');
    const vehicles = await Vehicle.find({ active: true }).sort({ capacityKg: 1 });
    const orders = await Order.find({ customer: user._id })
      .sort({ createdAt: -1 })
      .limit(40)
      .populate('vehicle')
      .populate('partner')
      .populate('customer');
    const activeOrder = orders.find((order) => !['delivered', 'cancelled'].includes(order.status));
    res.json({
      user: serializeUser(user),
      vehicles: vehicles.map(serializeVehicle),
      activeOrder: activeOrder ? serializeOrder(activeOrder) : undefined,
      orders: orders.map(serializeOrder)
    });
  })
);

customerRouter.post(
  '/estimate',
  asyncRoute(async (req: AuthRequest, res) => {
    const body = EstimateSchema.parse(req.body);
    const user = await User.findById(req.auth!.userId);
    const vehicle = await Vehicle.findById(body.vehicleId);
    if (!user || !vehicle) throw new ApiError(404, 'Customer or vehicle not found');
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
    if (body.weightKg > vehicle.capacityKg) throw new ApiError(400, 'Selected vehicle cannot carry this weight');

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
      status: 'offered',
      etaMinutes: fare.etaMinutes,
      timeline: createTimeline('offered'),
      verification: {
        pickupOtpHash: await hashOtp(pickupOtp),
        dropOtpHash: await hashOtp(dropOtp)
      }
    });

    if (fare.coins > 0) {
      await User.updateOne({ _id: user._id }, { $inc: { 'customerProfile.coins': -fare.coins } });
    }

    const fullOrder = await populatedOrder(order._id);
    if (!fullOrder) throw new ApiError(500, 'Order could not be loaded');
    const payload = serializeOrder(fullOrder);
    await sendSms(user.phone, `Indiery order ${order.orderNo}: pickup OTP ${pickupOtp}, drop OTP ${dropOtp}.`);
    const onlinePartners = await User.find({ role: 'partner', 'partnerProfile.online': true }).select('expoPushTokens');
    await Promise.all(
      onlinePartners.map((partner) =>
        sendPush(partner.expoPushTokens, 'New Indiery order', `${body.pickup} to ${body.drop}`, {
          orderId: String(order._id),
          orderNo: order.orderNo
        })
      )
    );
    emitOrderChanged(payload, String(user._id));
    emitPartnerQueueChanged();
    res.status(201).json({
      order: payload,
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
    res.json({ orders: orders.map(serializeOrder) });
  })
);

customerRouter.get(
  '/orders/:orderId',
  asyncRoute(async (req: AuthRequest, res) => {
    const order = await populatedOrder(String(req.params.orderId));
    if (!order || String(order.customer._id) !== req.auth!.userId) throw new ApiError(404, 'Order not found');
    res.json({ order: serializeOrder(order) });
  })
);

customerRouter.post(
  '/orders/:orderId/payment/confirm',
  asyncRoute(async (req: AuthRequest, res) => {
    const order = await Order.findOne({ _id: String(req.params.orderId), customer: req.auth!.userId });
    if (!order) throw new ApiError(404, 'Order not found');
    order.paymentStatus = 'paid';
    if (typeof req.body?.reference === 'string') order.paymentReference = req.body.reference;
    await order.save();
    const fullOrder = await populatedOrder(order._id);
    const payload = fullOrder ? serializeOrder(fullOrder) : { id: String(order._id) };
    emitOrderChanged(payload, req.auth!.userId, order.partner ? String(order.partner) : undefined);
    res.json({ order: payload });
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
    order.set('timeline', createTimeline('cancelled'));
    await order.save();
    if (order.fare.coins > 0) {
      await User.updateOne({ _id: req.auth!.userId }, { $inc: { 'customerProfile.coins': order.fare.coins } });
      await WalletLedger.create({
        user: req.auth!.userId,
        order: order._id,
        amount: order.fare.coins,
        kind: 'credit',
        title: `Coins returned ${order.orderNo}`,
        reference: order.orderNo
      });
    }
    const fullOrder = await populatedOrder(order._id);
    emitOrderChanged(fullOrder ? serializeOrder(fullOrder) : { id: String(order._id) }, req.auth!.userId);
    emitPartnerQueueChanged();
    res.json({ order: fullOrder ? serializeOrder(fullOrder) : undefined });
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
    const user = await User.findByIdAndUpdate(
      req.auth!.userId,
      { $inc: { 'customerProfile.coins': coins } },
      { new: true }
    );
    if (!user) throw new ApiError(404, 'Customer not found');
    res.json({ user: serializeUser(user), addedCoins: coins });
  })
);
