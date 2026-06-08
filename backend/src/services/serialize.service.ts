import type { OrderDocument } from '../models/Order';
import type { UserDocument } from '../models/User';
import type { VehicleDocument } from '../models/Vehicle';

function idOf(value: unknown) {
  if (value && typeof value === 'object' && '_id' in value) return String(value._id);
  return String(value || '');
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
    fare: order.fare,
    paymentMode: order.paymentMode,
    paymentStatus: order.paymentStatus,
    paymentProvider: order.paymentProvider,
    paymentReference: order.paymentReference,
    status: order.status,
    etaMinutes: order.etaMinutes,
    timeline: order.timeline,
    pod: order.pod,
    partnerLocation: order.partnerLocation,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}
