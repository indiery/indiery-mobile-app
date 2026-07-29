import type { OrderDocument } from '../models/Order';
import type { UserDocument } from '../models/User';
import type { VehicleDocument } from '../models/Vehicle';
import { normalizeFareBreakup } from './fare.service';

function idOf(value: unknown) {
  if (value && typeof value === 'object' && '_id' in value) return String(value._id);
  return String(value || '');
}

function serializeSavedAddresses(savedAddresses: unknown[] = []) {
  return savedAddresses
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: `legacy-${index}`,
          label: item,
          address: item,
          type: 'other' as const
        };
      }
      const address = (item ?? {}) as Record<string, unknown>;
      const label = typeof address.label === 'string' ? address.label : typeof address.address === 'string' ? address.address : '';
      const fullAddress = typeof address.address === 'string' ? address.address : label;
      if (!label || !fullAddress) return undefined;
      return {
        id: typeof address.id === 'string' ? address.id : `saved-${index}`,
        label,
        address: fullAddress,
        addressLine: typeof address.addressLine === 'string' ? address.addressLine : undefined,
        lat: typeof address.lat === 'number' ? address.lat : undefined,
        lng: typeof address.lng === 'number' ? address.lng : undefined,
        type: address.type === 'home' || address.type === 'work' || address.type === 'other' ? address.type : 'other'
      };
    })
    .filter(Boolean);
}

export function serializeUser(user: UserDocument) {
  const customerProfile = user.customerProfile
    ? {
        coins: user.customerProfile.coins ?? 0,
        walletBalance: user.customerProfile.walletBalance ?? 0,
        savedAddresses: serializeSavedAddresses(user.customerProfile.savedAddresses as unknown[] | undefined)
      }
    : undefined;
  const rawPartnerProfile = user.partnerProfile
    ? 'toObject' in user.partnerProfile && typeof user.partnerProfile.toObject === 'function'
      ? user.partnerProfile.toObject()
      : user.partnerProfile
    : undefined;
  const partnerProfile = rawPartnerProfile
    ? {
        ...rawPartnerProfile,
        vehicleId: rawPartnerProfile.vehicleId ? idOf(rawPartnerProfile.vehicleId) : undefined
      }
    : undefined;

  return {
    id: String(user._id),
    role: user.role,
    name: user.name,
    initials: user.initials,
    phone: user.phone,
    email: user.email,
    city: user.city,
    customerProfile,
    partnerProfile
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

function visibleTripOtp(order: OrderDocument) {
  if (['delivered', 'cancelled'].includes(order.status)) return undefined;
  const pickup = order.pod?.pickupOtpVerified ? undefined : order.verification?.pickupOtp;
  const drop = order.pod?.dropOtpVerified ? undefined : order.verification?.dropOtp;
  if (!pickup && !drop) return undefined;
  return { pickup, drop };
}

export function serializeOrder(order: OrderDocument, options: { includeTripOtp?: boolean } = {}) {
  const vehicle = order.vehicle as unknown as VehicleDocument;
  const partner = order.partner as unknown as UserDocument | undefined;
  const customer = order.customer as unknown as UserDocument;
  const orderActive = !['delivered', 'cancelled'].includes(order.status);

  return {
    id: String(order._id),
    orderNo: order.orderNo,
    customerId: idOf(order.customer),
    partnerId: order.partner ? idOf(order.partner) : undefined,
    customer: customer?.name ? serializeUser(customer) : undefined,
    partner: partner?.name ? serializeUser(partner) : undefined,
    vehicle: vehicle?.name ? serializeVehicle(vehicle) : { id: idOf(order.vehicle) },
    pickup: order.pickup,
    extraStops: order.extraStops ?? [],
    drop: order.drop,
    goodsType: order.goodsType,
    weightKg: order.weightKg,
    distanceKm: order.distanceKm,
    fare: normalizeFareBreakup(order.fare, order.distanceKm),
    paymentMode: order.paymentMode,
    paymentStatus: order.paymentStatus,
    paymentProvider: order.paymentProvider,
    paymentReference: order.paymentReference,
    status: order.status,
    etaMinutes: order.etaMinutes,
    timeline: order.timeline,
    pod: order.pod,
    tripOtp: options.includeTripOtp ? visibleTripOtp(order) : undefined,
    partnerLocation: orderActive ? order.partnerLocation : undefined,
    settlement: order.settlement,
    customerCancellation: order.customerCancellation,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}
