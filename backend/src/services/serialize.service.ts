import type { OrderDocument } from '../models/Order';
import type { UserDocument } from '../models/User';
import type { VehicleDocument } from '../models/Vehicle';

function idOf(value: unknown) {
  if (value && typeof value === 'object' && '_id' in value) return String(value._id);
  return String(value || '');
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function normalizeFare(fareInput: unknown, distanceKmInput: unknown) {
  const fare = (fareInput ?? {}) as Record<string, number | undefined>;
  const distanceKm = typeof distanceKmInput === 'number' ? distanceKmInput : Number(distanceKmInput || 0);
  const base = fare.base ?? 0;
  const distance = fare.distance ?? 0;
  const orderValue = fare.orderValue ?? base + distance;
  const gst = fare.gst ?? Math.round(orderValue * 0.18);
  const coins = fare.coins ?? 0;
  const driverCommission = fare.driverCommission ?? roundMoney(orderValue * 0.8);
  const platformCommission = fare.platformCommission ?? roundMoney(orderValue * 0.15);
  const reserveAmount = fare.reserveAmount ?? roundMoney(orderValue * 0.05);
  const lateDriverPenalty = fare.lateDriverPenalty ?? roundMoney(driverCommission * 0.05);
  const latePlatformPenalty = fare.latePlatformPenalty ?? roundMoney(platformCommission * 0.05);
  const lateRefundCoins = fare.lateRefundCoins ?? roundMoney(lateDriverPenalty + latePlatformPenalty + reserveAmount);
  const onTimePartnerPayout = fare.onTimePartnerPayout ?? roundMoney(driverCommission + reserveAmount);
  const latePartnerPayout = fare.latePartnerPayout ?? roundMoney(driverCommission - lateDriverPenalty);

  return {
    distanceKm,
    billableKm: fare.billableKm ?? Math.max(1, Math.ceil(distanceKm)),
    orderValue,
    base,
    distance,
    gst,
    coins,
    total: fare.total ?? orderValue + gst - coins,
    driverCommission,
    reserveAmount,
    partnerNet: fare.partnerNet ?? onTimePartnerPayout,
    platformCommission,
    lateDriverPenalty,
    latePlatformPenalty,
    lateRefundCoins,
    onTimePartnerPayout,
    latePartnerPayout,
    etaMinutes: fare.etaMinutes ?? 0
  };
}

export function serializeUser(user: UserDocument) {
  return {
    id: String(user._id),
    role: user.role,
    name: user.name,
    initials: user.initials,
    phone: user.phone,
    email: user.email,
    city: user.city,
    customerProfile: user.customerProfile,
    partnerProfile: user.partnerProfile
  };
}

export function serializeVehicle(vehicle: VehicleDocument) {
  return {
    id: String(vehicle._id),
    code: vehicle.code,
    name: vehicle.name,
    shortName: vehicle.shortName,
    icon: vehicle.icon,
    serviceType: vehicle.serviceType,
    capacityKg: vehicle.capacityKg,
    baseFare: vehicle.baseFare,
    perKm: vehicle.perKm,
    partnerShare: vehicle.partnerShare,
    etaMinutes: vehicle.etaMinutes
  };
}

export function serializeOrder(order: OrderDocument) {
  const vehicle = order.vehicle as unknown as VehicleDocument;
  const partner = order.partner as unknown as UserDocument | undefined;
  const customer = order.customer as unknown as UserDocument;

  return {
    id: String(order._id),
    orderNo: order.orderNo,
    customerId: idOf(order.customer),
    partnerId: order.partner ? idOf(order.partner) : undefined,
    customer: customer?.name ? serializeUser(customer) : undefined,
    partner: partner?.name ? serializeUser(partner) : undefined,
    vehicle: vehicle?.name ? serializeVehicle(vehicle) : { id: idOf(order.vehicle) },
    pickup: order.pickup,
    drop: order.drop,
    goodsType: order.goodsType,
    weightKg: order.weightKg,
    distanceKm: order.distanceKm,
    fare: normalizeFare(order.fare, order.distanceKm),
    paymentMode: order.paymentMode,
    paymentStatus: order.paymentStatus,
    paymentProvider: order.paymentProvider,
    paymentReference: order.paymentReference,
    status: order.status,
    etaMinutes: order.etaMinutes,
    timeline: order.timeline,
    pod: order.pod,
    partnerLocation: order.partnerLocation,
    settlement: order.settlement,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}
