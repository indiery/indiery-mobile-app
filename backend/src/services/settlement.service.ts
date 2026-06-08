import { OrderDocument } from '../models/Order';

export function isOrderDelayed(order: OrderDocument, deliveredAt = new Date()) {
  const createdAt = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
  const deadline = createdAt.getTime() + order.etaMinutes * 60 * 1000;
  return deliveredAt.getTime() > deadline;
}

export function calculateDeliverySettlement(order: OrderDocument, deliveredAt = new Date()) {
  const delayed = isOrderDelayed(order, deliveredAt);
  return {
    delayed,
    partnerCredit: delayed ? order.fare.latePartnerPayout : order.fare.onTimePartnerPayout,
    customerRefundCoins: delayed ? order.fare.lateRefundCoins : 0,
    driverPenalty: delayed ? order.fare.lateDriverPenalty : 0,
    platformPenalty: delayed ? order.fare.latePlatformPenalty : 0,
    reserveReleasedTo: delayed ? ('customer' as const) : ('partner' as const),
    settledAt: deliveredAt
  };
}
