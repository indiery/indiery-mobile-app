import { OrderDocument } from '../models/Order';

function orderTimelineTime(order: OrderDocument, key: string) {
  const at = order.timeline?.find((item) => item.key === key)?.at;
  if (!at) return undefined;
  const time = new Date(at).getTime();
  return Number.isNaN(time) ? undefined : time;
}

export function isOrderDelayed(order: OrderDocument, deliveredAt = new Date()) {
  const pickedUpAt = orderTimelineTime(order, 'picked_up');
  const fallbackStartAt = order.createdAt instanceof Date ? order.createdAt.getTime() : new Date(order.createdAt).getTime();
  const deadline = (pickedUpAt ?? fallbackStartAt) + order.etaMinutes * 60 * 1000;
  return deliveredAt.getTime() > deadline;
}

export function calculateDeliverySettlement(order: OrderDocument, deliveredAt = new Date()) {
  const delayed = isOrderDelayed(order, deliveredAt);
  return {
    delayed,
    partnerCredit: delayed ? order.fare.latePartnerPayout : order.fare.onTimePartnerPayout,
    driverPenalty: delayed ? order.fare.lateDriverPenalty : 0,
    platformPenalty: delayed ? order.fare.latePlatformPenalty : 0,
    reserveReleasedTo: delayed ? ('platform' as const) : ('partner' as const),
    settledAt: deliveredAt
  };
}
