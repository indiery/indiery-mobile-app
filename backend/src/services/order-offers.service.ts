import { Types } from 'mongoose';
import { Order, type OrderDocument } from '../models/Order';
import { User, type UserDocument } from '../models/User';
import { serializeOrder } from './serialize.service';
import { sendPush } from './notification.service';
import { setOrderStatusTimeline } from './timeline.service';
import { emitOrderChanged, emitPartnerQueueChanged } from '../realtime/socket';

export const DRIVER_OFFER_BATCH_SIZE = 3;
export const DRIVER_OFFER_TIMEOUT_MS = 30_000;
export const MIN_PARTNER_WALLET_BALANCE = 200;

const activePartnerStatuses = ['accepted', 'arrived_pickup', 'picked_up', 'in_transit'];
const offerTimers = new Map<string, NodeJS.Timeout>();

function idOf(value: unknown) {
  if (!value) return '';
  if (typeof value === 'object' && '_id' in value) return String((value as { _id: unknown })._id);
  return String(value);
}

function objectIds(values: string[]) {
  return values.map((value) => new Types.ObjectId(value));
}

function idsFromOrderField(values: unknown[] | undefined) {
  return (values ?? []).map(idOf).filter(Boolean);
}

function orderVehicleId(order: OrderDocument) {
  return idOf(order.vehicle);
}

function distanceKm(
  from?: { lat?: number | null; lng?: number | null } | null,
  to?: { lat?: number | null; lng?: number | null } | null
) {
  if (
    typeof from?.lat !== 'number' ||
    typeof from.lng !== 'number' ||
    typeof to?.lat !== 'number' ||
    typeof to.lng !== 'number'
  ) {
    return Number.MAX_SAFE_INTEGER;
  }

  const earthRadiusKm = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function populatedOrder(orderId: string | Types.ObjectId) {
  return Order.findById(orderId)
    .populate('vehicle')
    .populate('partner')
    .populate('customer');
}

function canDispatchOrder(order: OrderDocument) {
  return (
    ['searching', 'offered'].includes(order.status) &&
    !order.partner &&
    (order.paymentMode === 'cash' || order.paymentStatus === 'paid')
  );
}

async function eligiblePartnersForOrder(order: OrderDocument) {
  const vehicleId = orderVehicleId(order);
  if (!vehicleId) return [];

  const [activePartnerIds, partners] = await Promise.all([
    Order.distinct('partner', {
      partner: { $exists: true, $ne: null },
      status: { $in: activePartnerStatuses }
    }),
    User.find({
      role: 'partner',
      'partnerProfile.online': true,
      'partnerProfile.kycStatus': 'verified',
      'partnerProfile.walletBalance': { $gte: MIN_PARTNER_WALLET_BALANCE },
      'partnerProfile.vehicleId': vehicleId,
      'partnerProfile.currentLocation.lat': { $type: 'number' },
      'partnerProfile.currentLocation.lng': { $type: 'number' }
    }).select('name expoPushTokens partnerProfile')
  ]);

  const blockedIds = new Set([
    ...activePartnerIds.map(idOf),
    ...idsFromOrderField(order.notifiedPartnerIds as unknown[]),
    ...idsFromOrderField(order.rejectedPartnerIds as unknown[])
  ]);
  const pickup = order.pickup;

  return partners
    .filter((partner) => !blockedIds.has(String(partner._id)))
    .map((partner) => ({
      partner,
      distance: distanceKm(pickup, partner.partnerProfile?.currentLocation)
    }))
    .sort((left, right) => left.distance - right.distance)
    .map((item) => item.partner);
}

function scheduleOfferAdvance(orderId: string) {
  const existing = offerTimers.get(orderId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    offerTimers.delete(orderId);
    offerOrderToNextDrivers(orderId, { force: true, reason: 'timeout' }).catch(() => undefined);
  }, DRIVER_OFFER_TIMEOUT_MS + 500);
  offerTimers.set(orderId, timer);
}

async function sendPartnerBatchPush(order: OrderDocument, partners: UserDocument[]) {
  await Promise.all(
    partners.map((partner) => {
      const pickupDistance = distanceKm(partner.partnerProfile?.currentLocation, order.pickup);
      const distanceLabel = Number.isFinite(pickupDistance) && pickupDistance < Number.MAX_SAFE_INTEGER
        ? `${pickupDistance < 10 ? pickupDistance.toFixed(1) : Math.round(pickupDistance)} km to pickup - `
        : '';
      return sendPush(partner.expoPushTokens, 'New Indiery order nearby', `${distanceLabel}${order.pickup.label} to ${order.drop.label}`, {
        event: 'order_offer',
        role: 'partner',
        screen: 'dashboard',
        orderId: String(order._id),
        orderNo: order.orderNo,
        status: order.status,
        ...(distanceLabel ? { pickupDistanceKm: Number(pickupDistance.toFixed(2)) } : {})
      }, { ttl: Math.ceil((DRIVER_OFFER_TIMEOUT_MS + 15_000) / 1000), collapseId: `offer-${String(order._id)}` });
    })
  );
}

async function sendCustomerSearchPush(order: OrderDocument, partnerCount: number) {
  const fullOrder = await populatedOrder(order._id);
  const customer = fullOrder?.customer as unknown as { expoPushTokens?: string[] } | undefined;
  const body = partnerCount
    ? `Sent to ${partnerCount} nearby driver${partnerCount === 1 ? '' : 's'}`
    : 'Searching for nearby online drivers';
  await sendPush(customer?.expoPushTokens, 'Finding nearby driver', body, {
    event: 'order_search',
    role: 'customer',
    screen: 'orders',
    orderId: String(order._id),
    orderNo: order.orderNo,
    status: order.status
  }, { ttl: 300, collapseId: `search-${String(order._id)}` });
}

async function emitOfferUpdates(orderId: string, partnerIds: string[] = []) {
  const fullOrder = await populatedOrder(orderId);
  if (!fullOrder) return;
  const payload = serializeOrder(fullOrder);
  emitOrderChanged(payload, idOf(fullOrder.customer));
  partnerIds.forEach((partnerId) => emitOrderChanged(payload, undefined, partnerId));
  emitPartnerQueueChanged();
}

export async function offerOrderToNextDrivers(
  orderId: string | Types.ObjectId,
  options: { force?: boolean; reason?: 'new' | 'payment' | 'timeout' | 'reject' | 'refresh' | 'driver_cancel' } = {}
) {
  const order = await Order.findById(orderId);
  if (!order || !canDispatchOrder(order)) return undefined;

  const now = new Date();
  const currentBatchIds = idsFromOrderField(order.offeredPartnerIds as unknown[]);
  const expiresAt = order.offerExpiresAt ? new Date(order.offerExpiresAt).getTime() : 0;
  const currentBatchActive = currentBatchIds.length > 0 && expiresAt > Date.now();
  if (currentBatchActive && !options.force) {
    scheduleOfferAdvance(String(order._id));
    return emitOfferUpdates(String(order._id), currentBatchIds);
  }

  const eligiblePartners = await eligiblePartnersForOrder(order);
  const nextPartners = eligiblePartners.slice(0, DRIVER_OFFER_BATCH_SIZE);
  const nextPartnerIds = nextPartners.map((partner) => String(partner._id));
  const notifiedIds = Array.from(new Set([...idsFromOrderField(order.notifiedPartnerIds as unknown[]), ...nextPartnerIds]));

  order.offeredPartnerIds = objectIds(nextPartnerIds);
  order.notifiedPartnerIds = objectIds(notifiedIds);
  order.offerBatch = (order.offerBatch ?? 0) + 1;
  order.offerBatchStartedAt = now;
  order.offerExpiresAt = new Date(now.getTime() + DRIVER_OFFER_TIMEOUT_MS);

  if (nextPartners.length) {
    setOrderStatusTimeline(order, 'offered');
  } else {
    setOrderStatusTimeline(order, 'searching');
  }

  await order.save();
  await Promise.all([
    nextPartners.length ? sendPartnerBatchPush(order, nextPartners) : Promise.resolve(),
    options.reason === 'new' || options.reason === 'payment'
      ? sendCustomerSearchPush(order, nextPartners.length)
      : Promise.resolve(),
    emitOfferUpdates(String(order._id), nextPartnerIds)
  ]);
  scheduleOfferAdvance(String(order._id));
  return serializeOrder((await populatedOrder(order._id)) ?? order);
}

export async function advanceExpiredOrderOffers(vehicleId?: string) {
  const now = new Date();
  const query: Record<string, unknown> = {
    status: { $in: ['searching', 'offered'] },
    $and: [
      { $or: [{ partner: { $exists: false } }, { partner: null }] },
      { $or: [{ paymentStatus: 'paid' }, { paymentMode: 'cash' }] },
      {
        $or: [
          { offerExpiresAt: { $lte: now } },
          { offerExpiresAt: { $exists: false } },
          { offeredPartnerIds: { $size: 0 } }
        ]
      }
    ]
  };
  if (vehicleId) query.vehicle = vehicleId;

  const orders = await Order.find(query).sort({ createdAt: 1 }).limit(10);
  await Promise.all(orders.map((order) => offerOrderToNextDrivers(order._id, { force: true, reason: 'refresh' })));
}

export async function rejectDriverOffer(orderId: string, partnerId: string) {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');
  const currentBatchIds = idsFromOrderField(order.offeredPartnerIds as unknown[]);
  if (!currentBatchIds.includes(partnerId)) return order;

  const rejectedIds = Array.from(new Set([...idsFromOrderField(order.rejectedPartnerIds as unknown[]), partnerId]));
  const remainingBatchIds = currentBatchIds.filter((id) => id !== partnerId);
  order.rejectedPartnerIds = objectIds(rejectedIds);
  order.offeredPartnerIds = objectIds(remainingBatchIds);
  await order.save();

  if (!remainingBatchIds.length) {
    await offerOrderToNextDrivers(order._id, { force: true, reason: 'reject' });
  } else {
    await emitOfferUpdates(String(order._id), remainingBatchIds);
  }
  return order;
}
