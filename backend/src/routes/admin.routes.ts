import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { asyncRoute } from '../middleware/error';
import { EnterpriseEnquiry } from '../models/EnterpriseEnquiry';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { Vehicle } from '../models/Vehicle';
import { WalletLedger } from '../models/WalletLedger';
import { B2bClient } from '../models/B2bClient';
import { AdminWorkspace } from '../models/AdminWorkspace';
import { Counter } from '../models/Counter';
import { ApiError } from '../middleware/error';
import { isValidObjectId } from 'mongoose';
import { calculateDeliverySettlement, calculatePartnerWalletSettlement } from '../services/settlement.service';
import { resolveRouteMetrics } from '../services/maps.service';
import { normalizeFareBreakup } from '../services/fare.service';
import { sendPush } from '../services/notification.service';
import { createRateLimit } from '../middleware/rateLimit';

export const adminRouter = Router();

adminRouter.use(requireAuth(['admin']));
adminRouter.use(createRateLimit({
  windowMs: 60_000,
  maxRequests: 300,
  keyGenerator: (req) => `admin:${(req as AuthRequest).auth?.userId || 'unknown'}`,
  message: 'Admin request limit reached. Please wait briefly before retrying.'
}));

adminRouter.get(
  '/enterprise-enquiries',
  asyncRoute(async (req, res) => {
    const query = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(25)
    }).parse(req.query);
    const [enquiries, total] = await Promise.all([
      EnterpriseEnquiry.find()
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      EnterpriseEnquiry.countDocuments()
    ]);
    res.json({ enquiries, total, page: query.page, limit: query.limit });
  })
);

const adminWorkspaceKeys = new Set([
  'customer-overrides',
  'tickets',
  'notifications',
  'areas',
  'users',
  'settings',
  'audit',
  'disputes'
]);

adminRouter.get('/workspace/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
    if (!adminWorkspaceKeys.has(key)) throw new ApiError(404, 'Admin workspace resource not found');
    const resource = await AdminWorkspace.findOne({ key }).lean();
    res.json({ key, value: resource?.value ?? null, updatedAt: resource?.updatedAt ?? null });
  } catch (error) {
    next(error);
  }
});

adminRouter.put('/workspace/:key', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const key = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
    if (!adminWorkspaceKeys.has(key)) throw new ApiError(404, 'Admin workspace resource not found');
    if (!Object.prototype.hasOwnProperty.call(req.body, 'value')) throw new ApiError(400, 'value is required');
    const serializedSize = Buffer.byteLength(JSON.stringify(req.body.value), 'utf8');
    if (serializedSize > 500_000) throw new ApiError(413, 'Admin workspace resource is too large');
    const resource = await AdminWorkspace.findOneAndUpdate(
      { key },
      { $set: { value: req.body.value, updatedBy: req.auth?.userId } },
      { new: true, upsert: true, runValidators: true }
    ).lean();
    res.json({ success: true, key, value: resource?.value, updatedAt: resource?.updatedAt });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/vehicles', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const vehicles = await Vehicle.find().sort({ name: 1 }).lean();
    res.json({ vehicles });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/vehicles/:id/pricing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid vehicle ID');

    const baseFare = Number(req.body.baseFare);
    const perKm = Number(req.body.perKm);
    const partnerShare = Number(req.body.partnerShare);
    const etaMinutes = Number(req.body.etaMinutes);
    if (!Number.isFinite(baseFare) || baseFare < 0) throw new ApiError(400, 'baseFare must be zero or greater');
    if (!Number.isFinite(perKm) || perKm < 0) throw new ApiError(400, 'perKm must be zero or greater');
    if (!Number.isFinite(partnerShare) || partnerShare < 0 || partnerShare > 1) {
      throw new ApiError(400, 'partnerShare must be between zero and one');
    }
    if (!Number.isInteger(etaMinutes) || etaMinutes < 1) throw new ApiError(400, 'etaMinutes must be a positive whole number');
    if (typeof req.body.active !== 'boolean') throw new ApiError(400, 'active must be a boolean');

    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { $set: { baseFare, perKm, partnerShare, etaMinutes, active: req.body.active } },
      { new: true, runValidators: true }
    ).lean();
    if (!vehicle) throw new ApiError(404, 'Vehicle not found');
    res.json({ success: true, vehicle });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/notifications/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    const audience = typeof req.body.audience === 'string' ? req.body.audience : '';
    if (!title || !message) throw new ApiError(400, 'title and message are required');

    const allowedAudiences = new Set([
      'all_customers',
      'all_drivers',
      'pending_kyc_drivers',
      'active_delivery_customers'
    ]);
    if (!allowedAudiences.has(audience)) throw new ApiError(400, 'Invalid notification audience');

    let userFilter: Record<string, unknown>;
    if (audience === 'all_customers') userFilter = { role: 'customer' };
    else if (audience === 'all_drivers') userFilter = { role: 'partner' };
    else if (audience === 'pending_kyc_drivers') {
      userFilter = { role: 'partner', 'partnerProfile.kycStatus': 'pending' };
    } else {
      const customerIds = await Order.distinct('customer', {
        status: { $in: ['accepted', 'arrived_pickup', 'picked_up', 'in_transit'] }
      });
      userFilter = { role: 'customer', _id: { $in: customerIds } };
    }

    const users = await User.find(userFilter).select('expoPushTokens').lean();
    const tokens = users.flatMap((user) => user.expoPushTokens ?? []);
    const campaignId = `NTF-${Date.now()}`;
    const result = await sendPush(tokens, title, message, { type: 'admin_campaign', campaignId }, { channelId: 'general' });
    res.json({ success: true, campaignId, audienceSize: users.length, ...result });
  } catch (error) {
    next(error);
  }
});

const ACTIVE_ORDER_STATUSES = ['accepted', 'arrived_pickup', 'picked_up', 'in_transit'];

function boundedLimit(value: unknown, fallback: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

async function nextOrderNo() {
  const counter = await Counter.findOneAndUpdate(
    { key: 'order' },
    { $inc: { value: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return `IND-${counter.value}`;
}

async function loadAssignableDriver(driverId: string) {
  if (!isValidObjectId(driverId)) throw new ApiError(400, 'Invalid driverId');

  const driver = await User.findOne({ _id: driverId, role: 'partner' });
  if (!driver) throw new ApiError(404, 'Driver partner not found');
  if (driver.status !== 'active') throw new ApiError(409, 'Driver account is not active');
  if (driver.partnerProfile?.kycStatus !== 'verified') {
    throw new ApiError(409, 'Driver KYC must be verified before assignment');
  }
  if (!driver.partnerProfile?.online) throw new ApiError(409, 'Driver must be online before assignment');

  const activeOrder = await Order.exists({ partner: driver._id, status: { $in: ACTIVE_ORDER_STATUSES } });
  if (activeOrder) throw new ApiError(409, 'Driver already has an active order');
  return driver;
}

async function loadOverviewMetrics() {
  const [
    activeOrders,
    searchingOrders,
    totalDrivers,
    onlineDrivers,
    pendingKyc,
    b2bClients,
    totalOrders,
    totalCustomers,
    paidOrders,
    partners,
    customers
  ] = await Promise.all([
    Order.countDocuments({ status: { $in: ['accepted', 'arrived_pickup', 'picked_up', 'in_transit'] } }),
    Order.countDocuments({ status: 'searching' }),
    User.countDocuments({ role: 'partner' }),
    User.countDocuments({ role: 'partner', 'partnerProfile.online': true }),
    User.countDocuments({ role: 'partner', 'partnerProfile.kycStatus': 'pending' }),
    B2bClient.countDocuments({ status: 'active' }),
    Order.countDocuments(),
    User.countDocuments({ role: 'customer' }),
    Order.find({ paymentStatus: 'paid' }).select('fare').lean(),
    User.find({ role: 'partner' }).select('partnerProfile.walletBalance').lean(),
    User.find({ role: 'customer' }).select('customerProfile.coins').lean()
  ]);

  const totals = paidOrders.reduce(
    (result, order) => ({
      totalGmv: result.totalGmv + (order.fare?.total || 0),
      platformCommission: result.platformCommission + (order.fare?.platformCommission || 0),
      driverEarnings: result.driverEarnings + (order.fare?.driverCommission || 0)
    }),
    { totalGmv: 0, platformCommission: 0, driverEarnings: 0 }
  );

  return {
    activeOrders,
    searchingOrders,
    totalOrders,
    totalCustomers,
    totalDrivers,
    onlineDrivers,
    pendingKyc,
    b2bClients,
    totalGmv: Math.round(totals.totalGmv),
    platformCommission: Math.round(totals.platformCommission),
    driverEarnings: Math.round(totals.driverEarnings),
    pendingDriverDisbursements: Math.round(
      partners.reduce((sum, partner) => sum + (partner.partnerProfile?.walletBalance || 0), 0)
    ),
    coinsInCirculation: customers.reduce(
      (sum, customer) => sum + (customer.customerProfile?.coins || 0),
      0
    )
  };
}

async function loadOrders(filter: Record<string, unknown>, limit: number) {
  return Order.find(filter)
    .select('orderNo customer b2bClient partner vehicle pickup drop goodsType weightKg distanceKm fare status paymentStatus paymentMode paymentReference customerCancellation cancellationReason partnerCancellationHistory createdAt updatedAt')
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate('partner', 'name phone partnerProfile.vehicleNumber partnerProfile.currentLocation partnerProfile.online status')
    .populate('customer', 'name phone email city status customerProfile.coins customerProfile.walletBalance')
    .populate('b2bClient', 'companyName contactPerson phone email contractType outstandingBalance')
    .populate('vehicle', 'name shortName icon code')
    .lean();
}

async function loadCustomers(limit: number) {
  return User.find({ role: 'customer' })
    .select('name phone email city status createdAt customerProfile.coins customerProfile.walletBalance')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

async function loadDrivers(filter: Record<string, unknown>, limit: number) {
  const drivers = await User.find(filter)
    .select('-expoPushTokens')
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate('partnerProfile.vehicleId', 'name shortName icon code capacityKg')
    .lean();

  const activeOrders = await Order.find({
    partner: { $in: drivers.map((driver) => driver._id) },
    status: { $in: ['accepted', 'arrived_pickup', 'picked_up', 'in_transit'] }
  })
    .select('orderNo status pickup drop distanceKm fare partner partnerLocation')
    .lean();

  const activeOrderMap = new Map(
    activeOrders
      .filter((order) => order.partner)
      .map((order) => [String(order.partner), order])
  );

  return drivers.map((driver) => ({
    ...driver,
    activeOrder: activeOrderMap.get(String(driver._id)) || null
  }));
}

async function loadFinanceData() {
  const [eligibleDrivers, recentPayouts] = await Promise.all([
    User.find({ role: 'partner', 'partnerProfile.walletBalance': { $gt: 0 } })
      .select('name phone partnerProfile.walletBalance partnerProfile.bankDetails partnerProfile.vehicleNumber partnerProfile.kycStatus')
      .sort({ 'partnerProfile.walletBalance': -1 })
      .lean(),
    WalletLedger.find({
      bucket: 'cash',
      kind: 'debit',
      settled: true,
      $or: [
        { reference: { $regex: /^DISB-/ } },
        { title: { $regex: /^Driver payout recorded/ } }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('user', 'name phone role partnerProfile.vehicleNumber')
      .lean()
  ]);

  return {
    totalPendingPayout: Math.round(
      eligibleDrivers.reduce((sum, driver) => sum + (driver.partnerProfile?.walletBalance || 0), 0)
    ),
    eligibleDrivers,
    recentPayouts
  };
}

async function loadCoinsData() {
  const [users, coinLedger] = await Promise.all([
    User.find({ role: 'customer' })
      .select('name phone email city status createdAt role customerProfile.coins customerProfile.walletBalance')
      .sort({ 'customerProfile.coins': -1 })
      .limit(50)
      .lean(),
    WalletLedger.find({ bucket: 'coins' })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('user', 'name phone role')
      .lean()
  ]);

  return { users, coinLedger };
}

adminRouter.get('/dashboard-snapshot', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [metrics, orders, drivers, clients, finance, coins, vehicles, customers] = await Promise.all([
      loadOverviewMetrics(),
      loadOrders({}, 500),
      loadDrivers({ role: 'partner' }, 200),
      B2bClient.find().sort({ companyName: 1 }).lean(),
      loadFinanceData(),
      loadCoinsData(),
      Vehicle.find().sort({ name: 1 }).lean(),
      loadCustomers(1000)
    ]);

    res.json({
      overview: { metrics },
      orders: { orders },
      drivers: { drivers },
      b2b: { clients },
      finance,
      coins,
      vehicles: { vehicles },
      customers: { customers },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// 1. DASHBOARD OVERVIEW
// ============================================================================
adminRouter.get('/overview', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ metrics: await loadOverviewMetrics() });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// 2. LIVE ORDERS & ORDER DISPATCH
// ============================================================================
adminRouter.get('/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, search, limit = '100' } = req.query;
    const filter: Record<string, unknown> = {};

    if (status && status !== 'all') {
      if (status === 'active') {
        filter.status = { $in: ['accepted', 'arrived_pickup', 'picked_up', 'in_transit'] };
      } else {
        filter.status = status;
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { orderNo: { $regex: q, $options: 'i' } },
        { 'pickup.contactName': { $regex: q, $options: 'i' } },
        { 'pickup.contactPhone': { $regex: q, $options: 'i' } },
        { 'drop.contactName': { $regex: q, $options: 'i' } },
        { 'drop.contactPhone': { $regex: q, $options: 'i' } }
      ];
    }

    const orders = await loadOrders(filter, boundedLimit(limit, 100, 500));

    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('partner')
      .populate('customer')
      .populate('b2bClient')
      .populate('vehicle')
      .lean();

    if (!order) throw new ApiError(404, 'Order not found');
    res.json({ order });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/customers/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, reason } = req.body;
    if (!['active', 'blocked'].includes(status)) {
      throw new ApiError(400, "status must be 'active' or 'blocked'");
    }
    if (typeof reason !== 'string' || !reason.trim()) {
      throw new ApiError(400, 'An account status reason is required');
    }
    const customer = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'customer' },
      { $set: { status } },
      { new: true }
    ).select('-expoPushTokens');
    if (!customer) throw new ApiError(404, 'Customer not found');
    res.json({ success: true, customer, reason: reason.trim() });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/customers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customers = await loadCustomers(boundedLimit(req.query.limit, 500, 1000));
    res.json({ customers });
  } catch (error) {
    next(error);
  }
});

// Manually assign order to driver
adminRouter.post('/orders/:id/assign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { driverId } = req.body;
    if (!driverId) throw new ApiError(400, 'driverId is required');

    const driver = await loadAssignableDriver(String(driverId));

    const order = await Order.findById(req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');
    if (!['searching', 'offered'].includes(order.status)) {
      throw new ApiError(409, `Order cannot be assigned while its status is '${order.status}'`);
    }

    order.partner = driver._id;
    order.status = 'accepted';
    if (driver.partnerProfile?.currentLocation) {
      order.partnerLocation = {
        lat: driver.partnerProfile.currentLocation.lat,
        lng: driver.partnerProfile.currentLocation.lng,
        heading: driver.partnerProfile.currentLocation.heading || 0,
        speed: driver.partnerProfile.currentLocation.speed || 0,
        updatedAt: new Date()
      };
    }

    order.timeline.push({
      key: 'manual_assignment',
      title: 'Manually Assigned by Admin',
      note: `Assigned to ${driver.name} (${driver.phone})`,
      state: 'active',
      at: new Date()
    });

    await order.save();
    const updated = await Order.findById(order._id)
      .populate('partner', 'name phone partnerProfile')
      .populate('customer', 'name phone')
      .populate('vehicle')
      .lean();

    res.json({ success: true, message: `Order assigned to ${driver.name}`, order: updated });
  } catch (error) {
    next(error);
  }
});

// Update order status lifecycle (Admin Operations Control)
adminRouter.post('/orders/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, note } = req.body;
    const allowed = ['accepted', 'arrived_pickup', 'picked_up', 'in_transit', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
      throw new ApiError(400, `Invalid status. Must be one of: ${allowed.join(', ')}`);
    }

    const order = await Order.findById(req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');

    const previousStatus = order.status;
    const allowedTransitions: Record<string, string[]> = {
      accepted: ['arrived_pickup', 'cancelled'],
      arrived_pickup: ['picked_up', 'cancelled'],
      picked_up: ['in_transit', 'cancelled'],
      in_transit: ['delivered', 'cancelled']
    };
    if (!allowedTransitions[previousStatus]?.includes(status)) {
      throw new ApiError(409, `Invalid order transition from '${previousStatus}' to '${status}'`);
    }
    if (status === 'delivered' && order.settlement?.settledAt) {
      throw new ApiError(409, 'Order earnings have already been settled');
    }
    order.status = status as any;

    const titles: Record<string, string> = {
      accepted: 'Driver Partner Accepted Order',
      arrived_pickup: 'Driver Arrived at Pickup Location',
      picked_up: 'Goods Loaded & In Route',
      in_transit: 'In Transit to Destination',
      delivered: 'Goods Delivered Successfully',
      cancelled: 'Order Cancelled by Dispatch HQ'
    };

    order.timeline.push({
      key: `status_${status}`,
      title: titles[status] || `Status updated to ${status}`,
      note: note || `Updated from ${previousStatus} by Dispatch Operations HQ`,
      state: status === 'cancelled' ? 'done' : 'active',
      at: new Date()
    });

    // If delivered, settle the driver wallet exactly once using the same
    // cash/prepaid rules as the partner app.
    if (status === 'delivered') {
      const settlement = calculateDeliverySettlement(order);
      order.set('settlement', settlement);
      if (order.paymentMode === 'cash' || order.paymentProvider === 'cash') {
        order.paymentStatus = 'paid';
      }
      if (order.partner) {
        const partner = await User.findById(order.partner);
        if (partner && partner.partnerProfile) {
          const walletSettlement = calculatePartnerWalletSettlement({
            paymentProvider: order.paymentProvider,
            customerTotal: order.fare.total,
            partnerCredit: settlement.partnerCredit
          });
          partner.partnerProfile.walletBalance = (partner.partnerProfile.walletBalance || 0) + walletSettlement.walletDelta;
          partner.partnerProfile.weeklyOrders = (partner.partnerProfile.weeklyOrders || 0) + 1;
          await partner.save();

          if (walletSettlement.ledgerKind) {
            await WalletLedger.create({
              user: partner._id,
              order: order._id,
              amount: walletSettlement.ledgerAmount,
              kind: walletSettlement.ledgerKind,
              bucket: 'cash',
              title: walletSettlement.cashCollected > 0
                ? `Cash settlement deduction ${order.orderNo}`
                : `Admin delivery settlement ${order.orderNo}`,
              reference: order.orderNo,
              settled: true
            });
          }
        }
      }
    }

    await order.save();
    const updated = await Order.findById(order._id)
      .populate('partner', 'name phone partnerProfile')
      .populate('customer', 'name phone')
      .populate('vehicle')
      .lean();

    res.json({ success: true, message: `Order #${order.orderNo} status updated to ${status}`, order: updated });
  } catch (error) {
    next(error);
  }
});

// Cancel Order with Reason
adminRouter.post('/orders/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason = 'Cancelled by Dispatch Operations' } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');
    if (['delivered', 'cancelled'].includes(order.status)) {
      throw new ApiError(409, `Order cannot be cancelled while its status is '${order.status}'`);
    }
    if (typeof reason !== 'string' || !reason.trim()) {
      throw new ApiError(400, 'Cancellation reason is required');
    }

    order.status = 'cancelled';
    order.cancellationReason = reason.trim();
    order.timeline.push({
      key: 'cancelled',
      title: 'Order Cancelled by Dispatcher',
      note: `Reason: ${reason.trim()}`,
      state: 'done',
      at: new Date()
    });

    await order.save();
    const updated = await Order.findById(order._id)
      .populate('partner')
      .populate('customer')
      .populate('vehicle')
      .lean();

    res.json({ success: true, message: `Order #${order.orderNo} cancelled`, order: updated });
  } catch (error) {
    next(error);
  }
});

// Create On-Demand Direct Customer Booking (Phone Orders / Walk-ins)
adminRouter.post('/orders/create-on-demand', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      customerName,
      customerPhone,
      pickupAddress,
      dropAddress,
      vehicleCode,
      goodsType,
      weightKg,
      totalFare,
      driverId
    } = req.body;

    if (!customerName || !customerPhone || !pickupAddress || !dropAddress || !vehicleCode || !goodsType) {
      throw new ApiError(400, 'customerName, customerPhone, pickupAddress, dropAddress, vehicleCode, and goodsType are required');
    }

    const fareNum = Number(totalFare);
    const weightNum = Number(weightKg);
    if (!Number.isFinite(fareNum) || fareNum <= 0) throw new ApiError(400, 'totalFare must be greater than zero');
    if (!Number.isFinite(weightNum) || weightNum <= 0) throw new ApiError(400, 'weightKg must be greater than zero');

    const selectedDriver = driverId ? await loadAssignableDriver(String(driverId)) : null;
    const routeMetrics = await resolveRouteMetrics({ pickup: pickupAddress, drop: dropAddress });

    let customer = await User.findOne({ phone: String(customerPhone).trim(), role: 'customer' });
    if (!customer) {
      customer = await User.create({
        role: 'customer',
        name: String(customerName).trim(),
        initials: String(customerName).trim().split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
        phone: String(customerPhone).trim(),
        status: 'active',
        customerProfile: { coins: 0, walletBalance: 0, savedAddresses: [] }
      });
    }

    const vehicle = await Vehicle.findOne({ code: vehicleCode, active: true });
    if (!vehicle) throw new ApiError(400, 'The requested vehicle type is invalid or inactive');

    const orderNo = await nextOrderNo();
    const fare = normalizeFareBreakup({
      orderValue: fareNum,
      base: Math.min(vehicle.baseFare, fareNum),
      distance: Math.max(0, fareNum - vehicle.baseFare),
      total: fareNum
    }, routeMetrics.distanceKm);

    const newOrder = new Order({
      orderNo,
      customer: customer._id,
      vehicle: vehicle._id,
      pickup: {
        label: 'Pickup Address',
        address: pickupAddress,
        contactName: String(customerName).trim(),
        contactPhone: customerPhone
      },
      drop: {
        label: 'Delivery Destination',
        address: dropAddress,
        contactName: String(customerName).trim(),
        contactPhone: customerPhone
      },
      goodsType,
      weightKg: weightNum,
      distanceKm: routeMetrics.distanceKm,
      fare,
      paymentMode: 'cash',
      paymentProvider: 'cash',
      paymentStatus: 'pending',
      status: selectedDriver ? 'accepted' : 'searching',
      timeline: [
        {
          key: 'created',
          title: 'Direct Order Booked via Dispatch HQ',
          note: `Booked for ${customer.name} (${customer.phone})`,
          state: 'done',
          at: new Date()
        }
      ]
    });

    if (selectedDriver) {
      newOrder.partner = selectedDriver._id;
      newOrder.timeline.push({
        key: 'assigned',
        title: 'Driver Partner Assigned',
        note: `Assigned to ${selectedDriver.name}`,
        state: 'active',
        at: new Date()
      });
    }

    await newOrder.save();
    const populated = await Order.findById(newOrder._id)
      .populate('partner')
      .populate('customer')
      .populate('b2bClient')
      .populate('vehicle')
      .lean();

    res.status(201).json({ success: true, message: `Order #${orderNo} created`, order: populated });
  } catch (error) {
    next(error);
  }
});

// Update a driver location supplied by the application.
adminRouter.post('/drivers/:id/location', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lat, lng, heading, speed } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw new ApiError(400, 'Valid numeric lat and lng are required');
    }
    if (heading !== undefined && typeof heading !== 'number') throw new ApiError(400, 'heading must be numeric');
    if (speed !== undefined && typeof speed !== 'number') throw new ApiError(400, 'speed must be numeric');

    const driver = await User.findById(req.params.id);
    if (!driver || driver.role !== 'partner') throw new ApiError(404, 'Driver not found');

    const partnerProfile = driver.partnerProfile ?? (driver.partnerProfile = {} as NonNullable<typeof driver.partnerProfile>);

    partnerProfile.currentLocation = {
      lat,
      lng,
      ...(heading !== undefined ? { heading } : {}),
      ...(speed !== undefined ? { speed } : {}),
      updatedAt: new Date()
    };
    await driver.save();

    // Also update any active orders assigned to this driver
    await Order.updateMany(
      { partner: driver._id, status: { $in: ['accepted', 'arrived_pickup', 'picked_up', 'in_transit'] } },
      {
        $set: {
          partnerLocation: {
            lat,
            lng,
            ...(heading !== undefined ? { heading } : {}),
            ...(speed !== undefined ? { speed } : {}),
            updatedAt: new Date()
          }
        }
      }
    );

    res.json({ success: true, currentLocation: partnerProfile.currentLocation });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// 3. DRIVER MANAGEMENT & 360° PROFILES
// ============================================================================
adminRouter.get('/drivers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, kycStatus, online, status, limit = '200' } = req.query;
    const filter: Record<string, unknown> = { role: 'partner' };

    if (kycStatus && kycStatus !== 'all') {
      filter['partnerProfile.kycStatus'] = kycStatus;
    }

    if (online === 'true') filter['partnerProfile.online'] = true;
    if (online === 'false') filter['partnerProfile.online'] = false;
    if (status && status !== 'all') filter.status = status;

    if (q && typeof q === 'string' && q.trim()) {
      const term = q.trim();
      filter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { 'partnerProfile.vehicleNumber': { $regex: term, $options: 'i' } }
      ];
    }

    const drivers = await loadDrivers(filter, boundedLimit(limit, 200, 500));
    res.json({ drivers });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/drivers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driver = await User.findOne({ _id: req.params.id, role: 'partner' })
      .select('-expoPushTokens')
      .populate('partnerProfile.vehicleId')
      .lean();

    if (!driver) throw new ApiError(404, 'Driver not found');

    const [activeOrder, recentOrders, ledger] = await Promise.all([
      Order.findOne({
        partner: driver._id,
        status: { $in: ['accepted', 'arrived_pickup', 'picked_up', 'in_transit'] }
      })
        .populate('customer', 'name phone')
        .populate('vehicle')
        .lean(),
      Order.find({ partner: driver._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('vehicle')
        .lean(),
      WalletLedger.find({ user: driver._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    ]);

    res.json({
      driver,
      activeOrder,
      recentOrders,
      ledger
    });
  } catch (error) {
    next(error);
  }
});

// Update Driver KYC status (accept/reject)
adminRouter.post('/drivers/:id/kyc', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, reason } = req.body;
    if (!['verified', 'rejected', 'pending'].includes(status)) {
      throw new ApiError(400, "status must be 'verified', 'rejected', or 'pending'");
    }
    if (status === 'rejected' && (typeof reason !== 'string' || !reason.trim())) {
      throw new ApiError(400, 'A rejection reason is required');
    }

    const driver = await User.findOne({ _id: req.params.id, role: 'partner' });
    if (!driver) throw new ApiError(404, 'Driver not found');

    const partnerProfile = driver.partnerProfile ?? (driver.partnerProfile = {} as NonNullable<typeof driver.partnerProfile>);

    if (status === 'verified') {
      const urls = partnerProfile.docUrls;
      const missing = [
        ['selfie', urls?.selfie],
        ['driving licence', urls?.drivingLicence],
        ['vehicle RC', urls?.rc]
      ].filter(([, url]) => typeof url !== 'string' || !url.trim()).map(([label]) => label);
      if (!urls?.pan && !urls?.aadhaar) missing.push('PAN or Aadhaar');
      if (missing.length > 0) {
        throw new ApiError(400, `Cannot approve KYC. Missing uploaded files: ${missing.join(', ')}`);
      }
      driver.status = 'active';
    }

    partnerProfile.kycStatus = status;
    partnerProfile.kycReviewedAt = new Date();
    partnerProfile.kycRejectionReason = status === 'rejected' ? reason.trim() : undefined;

    await driver.save();
    res.json({
      success: true,
      message: `KYC for ${driver.name} marked as ${status}${reason ? ` (${reason})` : ''}`,
      driver
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/drivers/:id/kyc/document', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { documentKey, approved, reason } = req.body;
    const allowedDocumentKeys = ['selfie', 'pan', 'aadhaar', 'drivingLicence', 'rc', 'insurance', 'bank'];
    if (!allowedDocumentKeys.includes(documentKey)) {
      throw new ApiError(400, 'Select a valid KYC document');
    }
    if (typeof approved !== 'boolean') {
      throw new ApiError(400, 'approved must be true or false');
    }
    if (!approved && (typeof reason !== 'string' || !reason.trim())) {
      throw new ApiError(400, 'A correction reason is required');
    }

    const driver = await User.findOne({ _id: req.params.id, role: 'partner' });
    if (!driver) throw new ApiError(404, 'Driver not found');

    const uploadedUrl = driver.get(`partnerProfile.docUrls.${documentKey}`);
    if (approved && (typeof uploadedUrl !== 'string' || !uploadedUrl.trim())) {
      throw new ApiError(400, 'The document cannot be approved until a file is uploaded');
    }

    driver.set(`partnerProfile.docs.${documentKey}`, approved);
    driver.set('partnerProfile.kycReviewedAt', new Date());
    if (!approved) {
      driver.set('partnerProfile.kycStatus', 'pending');
      driver.set('partnerProfile.kycRejectionReason', `${documentKey}: ${reason.trim()}`);
    }
    await driver.save();

    res.json({
      success: true,
      message: approved ? `${documentKey} approved` : `Correction requested for ${documentKey}`,
      documentKey,
      approved,
      reviewedAt: driver.partnerProfile?.kycReviewedAt
    });
  } catch (error) {
    next(error);
  }
});

// Toggle driver block/active status
adminRouter.post('/drivers/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!['active', 'blocked'].includes(status)) {
      throw new ApiError(400, "status must be 'active' or 'blocked'");
    }

    if (!isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid driver id');
    const existingDriver = await User.findOne({ _id: req.params.id, role: 'partner' });
    if (!existingDriver) throw new ApiError(404, 'Driver not found');
    if (status === 'active' && existingDriver.partnerProfile?.kycStatus !== 'verified') {
      throw new ApiError(409, 'Driver KYC must be verified before account activation');
    }

    const updateDoc: Record<string, unknown> = { status };
    if (status === 'blocked') {
      updateDoc['partnerProfile.online'] = false;
    }

    const driver = await User.findOneAndUpdate(
      { _id: existingDriver._id, role: 'partner' },
      { $set: updateDoc },
      { new: true }
    );
    if (!driver) throw new ApiError(404, 'Driver not found');

    res.json({ success: true, status: driver.status, driver });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// 4. FINANCIAL SETTLEMENTS & DRIVER PAYMENT DISBURSEMENT
// ============================================================================
adminRouter.get('/finance', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await loadFinanceData());
  } catch (error) {
    next(error);
  }
});

// Execute payout disbursement to driver
adminRouter.post('/finance/disburse', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { driverId, amount, paymentMode = 'upi', reference } = req.body;
    const amountNumber = Number(amount);
    const allowedPaymentModes = ['upi', 'neft', 'cash'];

    if (!driverId || !Number.isFinite(amountNumber) || amountNumber <= 0) {
      throw new ApiError(400, 'Valid driverId and amount are required');
    }
    if (Math.round(amountNumber * 100) !== amountNumber * 100) {
      throw new ApiError(400, 'Payout amount can have at most two decimal places');
    }
    if (!allowedPaymentModes.includes(paymentMode)) {
      throw new ApiError(400, 'paymentMode must be upi, neft, or cash');
    }
    if (typeof reference !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]{2,79}$/.test(reference.trim())) {
      throw new ApiError(400, 'A valid payment transaction or receipt reference is required');
    }

    const cleanReference = reference.trim();
    const duplicateReference = await WalletLedger.exists({
      bucket: 'cash',
      kind: 'debit',
      settled: true,
      reference: cleanReference
    });
    if (duplicateReference) {
      throw new ApiError(409, 'This payment reference has already been recorded');
    }

    const driver = await User.findOne({ _id: driverId, role: 'partner' });
    if (!driver) throw new ApiError(404, 'Driver partner not found');

    // Financial Safety & Compliance Check: Must be KYC verified
    if (driver.partnerProfile?.kycStatus !== 'verified') {
      throw new ApiError(403, `Compliance Guard: Driver ${driver.name} cannot receive payouts because KYC is '${driver.partnerProfile?.kycStatus || 'pending'}'. Review and approve KYC before disbursing funds.`);
    }

    if (paymentMode === 'neft' && (!driver.partnerProfile?.bankDetails?.accountNumberMasked || !driver.partnerProfile?.bankDetails?.ifsc)) {
      throw new ApiError(400, 'Bank account and IFSC details are required for NEFT payout');
    }

    const updatedDriver = await User.findOneAndUpdate(
      {
        _id: driver._id,
        role: 'partner',
        'partnerProfile.kycStatus': 'verified',
        'partnerProfile.walletBalance': { $gte: amountNumber }
      },
      { $inc: { 'partnerProfile.walletBalance': -amountNumber } },
      { new: true }
    );
    if (!updatedDriver) {
      throw new ApiError(409, 'Payout could not be recorded. Refresh and check the current wallet balance.');
    }

    let ledger;
    try {
      ledger = await WalletLedger.create({
        user: driver._id,
        amount: amountNumber,
        kind: 'debit',
        bucket: 'cash',
        title: `Driver payout recorded (${paymentMode.toUpperCase()})`,
        reference: cleanReference,
        settled: true
      });
    } catch (ledgerError) {
      await User.updateOne(
        { _id: driver._id },
        { $inc: { 'partnerProfile.walletBalance': amountNumber } }
      );
      throw ledgerError;
    }

    res.json({
      success: true,
      message: `Recorded payout of ₹${amountNumber} to ${driver.name}`,
      remainingBalance: updatedDriver.partnerProfile?.walletBalance || 0,
      ledger
    });
  } catch (error) {
    next(error);
  }
});

// Export Payout Batch to CSV for Banking Portals (RazorpayX, ICICI, HDFC)
adminRouter.get('/finance/export-payouts-csv', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const eligibleDrivers = await User.find({
      role: 'partner',
      'partnerProfile.walletBalance': { $gt: 0 }
    })
      .select('name phone partnerProfile.walletBalance partnerProfile.bankDetails partnerProfile.kycStatus partnerProfile.vehicleNumber')
      .lean();

    let csv = 'Driver Name,Phone,Vehicle Plate,Wallet Balance (INR),Bank Account,IFSC,Account Holder,KYC Status,Payout Eligibility\n';
    for (const d of eligibleDrivers) {
      const isEligible = d.partnerProfile?.kycStatus === 'verified';
      csv += `"${d.name}","${d.phone}","${d.partnerProfile?.vehicleNumber || ''}",${d.partnerProfile?.walletBalance || 0},"${d.partnerProfile?.bankDetails?.accountNumberMasked || 'Pending'}","${d.partnerProfile?.bankDetails?.ifsc || 'Pending'}","${d.partnerProfile?.bankDetails?.accountHolder || d.name}","${d.partnerProfile?.kycStatus || 'pending'}","${isEligible ? 'ELIGIBLE' : 'BLOCKED_KYC'}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="indiery-payout-batch-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// 5. COIN CONTROL
// ============================================================================
adminRouter.get('/coins', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q = '' } = req.query;
    const filter: Record<string, unknown> = { role: 'customer' };

    if (q && typeof q === 'string' && q.trim()) {
      filter.$or = [
        { name: { $regex: q.trim(), $options: 'i' } },
        { phone: { $regex: q.trim(), $options: 'i' } }
      ];
    }

    if (Object.keys(filter).length === 1) {
      res.json(await loadCoinsData());
      return;
    }

    const [users, coinLedger] = await Promise.all([
      User.find(filter)
        .select('name phone email city status createdAt role customerProfile.coins customerProfile.walletBalance')
        .sort({ 'customerProfile.coins': -1 })
        .limit(50)
        .lean(),
      WalletLedger.find({ bucket: 'coins' })
        .sort({ createdAt: -1 })
        .limit(30)
        .populate('user', 'name phone role')
        .lean()
    ]);

    res.json({ users, coinLedger });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/coins/adjust', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, phone, amount, type = 'credit', reason } = req.body;
    const numAmount = Number(amount);

    if (!Number.isInteger(numAmount) || numAmount <= 0) {
      throw new ApiError(400, 'Coin amount must be a positive whole number');
    }
    if (!['credit', 'debit'].includes(type)) {
      throw new ApiError(400, "type must be 'credit' or 'debit'");
    }
    if (typeof reason !== 'string' || !reason.trim()) {
      throw new ApiError(400, 'A reason is required for coin adjustments');
    }

    let user;
    if (userId) {
      user = await User.findOne({ _id: userId, role: 'customer' });
    } else if (phone) {
      user = await User.findOne({ phone: String(phone).trim(), role: 'customer' });
    }

    if (!user) throw new ApiError(404, 'User not found');

    const customerProfile = user.customerProfile ?? (user.customerProfile = {
      coins: 0,
      walletBalance: 0,
      savedAddresses: [],
      usedCoupons: []
    } as NonNullable<typeof user.customerProfile>);

    const currentCoins = customerProfile.coins || 0;
    if (type === 'debit' && numAmount > currentCoins) {
      throw new ApiError(409, `Cannot debit ${numAmount} coins; current balance is ${currentCoins}`);
    }
    const newCoins = type === 'credit' ? currentCoins + numAmount : currentCoins - numAmount;
    customerProfile.coins = newCoins;
    await user.save();

    const ledger = await WalletLedger.create({
      user: user._id,
      amount: numAmount,
      kind: type as 'credit' | 'debit',
      bucket: 'coins',
      title: `Admin Coin Adjustment: ${reason.trim()}`,
      reference: 'ADMIN-COIN-' + Date.now(),
      settled: true
    });

    res.json({
      success: true,
      message: `${type === 'credit' ? 'Credited' : 'Deducted'} ${numAmount} coins for ${user.name}`,
      coins: newCoins,
      ledger
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// 6. B2B CORPORATE CLIENTS & MANUAL B2B ASSIGNMENTS
// ============================================================================
adminRouter.get('/b2b/clients', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const clients = await B2bClient.find().sort({ companyName: 1 }).lean();
    res.json({ clients });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/b2b/clients', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyName, contactPerson, phone, email, address, contractType, gstin } = req.body;
    if (!companyName || !contactPerson || !phone || !address) {
      throw new ApiError(400, 'companyName, contactPerson, phone, and address are required');
    }

    const client = await B2bClient.create({
      companyName,
      contactPerson,
      phone,
      email,
      address,
      contractType: contractType || 'on_demand',
      gstin
    });

    res.status(201).json({ success: true, client });
  } catch (error) {
    next(error);
  }
});

// Create and manually assign order for B2B Client
adminRouter.post('/orders/create-b2b', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      b2bClientId,
      driverId,
      vehicleCode,
      pickup,
      drop,
      goodsType,
      weightKg,
      totalFare
    } = req.body;

    if (!pickup?.address || !drop?.address || !vehicleCode || !goodsType) {
      throw new ApiError(400, 'Pickup, drop, vehicleCode, and goodsType are required');
    }

    const fareNum = Number(totalFare);
    const weightNum = Number(weightKg);
    if (!Number.isFinite(fareNum) || fareNum <= 0) throw new ApiError(400, 'totalFare must be greater than zero');
    if (!Number.isFinite(weightNum) || weightNum <= 0) throw new ApiError(400, 'weightKg must be greater than zero');

    if (!b2bClientId || !isValidObjectId(b2bClientId)) {
      throw new ApiError(400, 'A valid B2B client is required');
    }
    const client = await B2bClient.findById(b2bClientId);
    if (!client) throw new ApiError(404, 'B2B client not found');
    const selectedDriver = driverId ? await loadAssignableDriver(String(driverId)) : null;
    const routeMetrics = await resolveRouteMetrics({
      pickup: pickup.address,
      drop: drop.address,
      pickupLat: typeof pickup.lat === 'number' ? pickup.lat : undefined,
      pickupLng: typeof pickup.lng === 'number' ? pickup.lng : undefined,
      dropLat: typeof drop.lat === 'number' ? drop.lat : undefined,
      dropLng: typeof drop.lng === 'number' ? drop.lng : undefined
    });
    const vehicle = await Vehicle.findOne({ code: vehicleCode, active: true });
    if (!vehicle) throw new ApiError(400, 'The requested vehicle type is invalid or inactive');

    // Find or create customer account for B2B client
    const clientPhone = client.phone;
    let customer = await User.findOne({ phone: clientPhone, role: 'customer' });
    if (!customer) {
      customer = await User.create({
        role: 'customer',
        name: client.companyName,
        initials: 'B2B',
        phone: clientPhone,
        ...(client.city ? { city: client.city } : {}),
        status: 'active'
      });
    }

    const orderNo = await nextOrderNo();

    const newOrder = new Order({
      orderNo,
      customer: customer._id,
      b2bClient: client._id,
      vehicle: vehicle._id,
      pickup: {
        label: client.companyName,
        address: pickup.address,
        ...(typeof pickup.lat === 'number' && typeof pickup.lng === 'number' ? { lat: pickup.lat, lng: pickup.lng } : {}),
        contactName: pickup.contactName || client.contactPerson,
        contactPhone: pickup.contactPhone || clientPhone
      },
      drop: {
        label: drop.label || drop.address,
        address: drop.address,
        ...(typeof drop.lat === 'number' && typeof drop.lng === 'number' ? { lat: drop.lat, lng: drop.lng } : {}),
        contactName: drop.contactName || client.contactPerson,
        contactPhone: drop.contactPhone || clientPhone
      },
      goodsType,
      weightKg: weightNum,
      distanceKm: routeMetrics.distanceKm,
      fare: normalizeFareBreakup({
        orderValue: fareNum,
        base: Math.min(vehicle.baseFare, fareNum),
        distance: Math.max(0, fareNum - vehicle.baseFare),
        total: fareNum
      }, routeMetrics.distanceKm),
      paymentMode: 'wallet',
      paymentProvider: 'wallet',
      paymentStatus: 'pending',
      status: selectedDriver ? 'accepted' : 'searching',
      timeline: [
        {
          key: 'created',
          title: 'B2B Order Created',
          note: `Created for ${client.companyName}`,
          state: 'done',
          at: new Date()
        }
      ]
    });

    if (selectedDriver) {
      newOrder.partner = selectedDriver._id;
      newOrder.timeline.push({
        key: 'assigned',
        title: 'Assigned to Driver',
        note: `Manually assigned to ${selectedDriver.name}`,
        state: 'active',
        at: new Date()
      });
      if (selectedDriver.partnerProfile?.currentLocation) {
        newOrder.partnerLocation = {
          lat: selectedDriver.partnerProfile.currentLocation.lat,
          lng: selectedDriver.partnerProfile.currentLocation.lng,
          heading: selectedDriver.partnerProfile.currentLocation.heading || 0,
          speed: selectedDriver.partnerProfile.currentLocation.speed || 0,
          updatedAt: new Date()
        };
      }
    }

    await newOrder.save();
    await B2bClient.updateOne({ _id: client._id }, { $inc: { outstandingBalance: fareNum } });
    const populated = await Order.findById(newOrder._id)
      .populate('partner')
      .populate('customer')
      .populate('vehicle')
      .lean();

    res.status(201).json({ success: true, order: populated });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// 7. REALTIME DATABASE HEALTH & SYNC
// ============================================================================
adminRouter.get('/health', async (_req: Request, res: Response) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});
