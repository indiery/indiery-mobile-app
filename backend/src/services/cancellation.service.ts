export const AFTER_PICKUP_CANCELLATION_WINDOW_MINUTES = 5;
export const AFTER_PICKUP_CANCELLATION_RATE = 0.1;

const PARTNER_EARNING_RATE = 0.8;
const PARTNER_RESERVE_RATE = 0.05;

const freeCancellationStatuses = new Set([
  'searching',
  'offered',
  'accepted',
  'arrived_pickup'
]);

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export type CustomerCancellationCalculation =
  | {
      allowed: true;
      policy:
        | 'free_before_pickup'
        | 'free_within_five_minutes_after_pickup'
        | 'ten_percent_after_five_minutes';
      charge: number;
      partnerCredit: number;
      platformCommission: number;
      pickedUpElapsedMinutes?: number;
    }
  | {
      allowed: false;
      reason: string;
    };

export function calculateCancellationPayment(input: {
  cancellationCharge: number;
  currentOrderTotal: number;
  waitingCharge: number;
  prepaid: boolean;
}) {
  const cancellationCharge = roundMoney(Math.max(0, input.cancellationCharge));
  const prepaidCapturedAmount = input.prepaid
    ? roundMoney(Math.max(0, input.currentOrderTotal - Math.max(0, input.waitingCharge)))
    : 0;
  const retainedFromPrepaid = roundMoney(Math.min(prepaidCapturedAmount, cancellationCharge));

  return {
    prepaidCapturedAmount,
    retainedFromPrepaid,
    refundAmount: roundMoney(Math.max(0, prepaidCapturedAmount - retainedFromPrepaid)),
    coinCharge: roundMoney(Math.max(0, cancellationCharge - retainedFromPrepaid))
  };
}

export function calculateCustomerCancellation(input: {
  status: string;
  total: number;
  pickedUpAt?: Date | number;
  now?: Date | number;
}): CustomerCancellationCalculation {
  if (freeCancellationStatuses.has(input.status)) {
    return {
      allowed: true,
      policy: 'free_before_pickup',
      charge: 0,
      partnerCredit: 0,
      platformCommission: 0
    };
  }

  if (!['picked_up', 'in_transit'].includes(input.status)) {
    return { allowed: false, reason: 'Order cannot be cancelled at this stage' };
  }

  const pickedUpAt = input.pickedUpAt instanceof Date
    ? input.pickedUpAt.getTime()
    : input.pickedUpAt;
  if (typeof pickedUpAt !== 'number' || !Number.isFinite(pickedUpAt)) {
    return { allowed: false, reason: 'Pickup time is unavailable. Please contact support.' };
  }

  const now = input.now instanceof Date ? input.now.getTime() : input.now ?? Date.now();
  const elapsedMs = Math.max(0, now - pickedUpAt);
  const windowMs = AFTER_PICKUP_CANCELLATION_WINDOW_MINUTES * 60_000;
  if (elapsedMs <= windowMs) {
    return {
      allowed: true,
      policy: 'free_within_five_minutes_after_pickup',
      charge: 0,
      partnerCredit: 0,
      platformCommission: 0,
      pickedUpElapsedMinutes: roundMoney(elapsedMs / 60_000)
    };
  }

  const total = Math.max(0, Number.isFinite(input.total) ? input.total : 0);
  const charge = roundMoney(total * AFTER_PICKUP_CANCELLATION_RATE);
  const partnerCredit = roundMoney(charge * (PARTNER_EARNING_RATE + PARTNER_RESERVE_RATE));

  return {
    allowed: true,
    policy: 'ten_percent_after_five_minutes',
    charge,
    partnerCredit,
    platformCommission: roundMoney(Math.max(0, charge - partnerCredit)),
    pickedUpElapsedMinutes: roundMoney(elapsedMs / 60_000)
  };
}
