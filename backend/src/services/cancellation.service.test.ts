import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateCancellationPayment, calculateCustomerCancellation } from './cancellation.service';

test('customer cancellation is free before pickup', () => {
  for (const status of ['searching', 'offered', 'accepted', 'arrived_pickup']) {
    assert.deepEqual(calculateCustomerCancellation({ status, total: 500 }), {
      allowed: true,
      policy: 'free_before_pickup',
      charge: 0,
      partnerCredit: 0,
      platformCommission: 0
    });
  }
});

test('customer cancellation is free through five minutes after pickup', () => {
  const pickedUpAt = new Date('2026-07-29T10:00:00.000Z');
  const result = calculateCustomerCancellation({
    status: 'in_transit',
    total: 500,
    pickedUpAt,
    now: new Date('2026-07-29T10:05:00.000Z')
  });

  assert.deepEqual(result, {
    allowed: true,
    policy: 'free_within_five_minutes_after_pickup',
    charge: 0,
    partnerCredit: 0,
    platformCommission: 0,
    pickedUpElapsedMinutes: 5
  });
});

test('customer pays ten percent when cancelling after five minutes from pickup', () => {
  const result = calculateCustomerCancellation({
    status: 'picked_up',
    total: 500,
    pickedUpAt: new Date('2026-07-29T10:00:00.000Z'),
    now: new Date('2026-07-29T10:05:00.001Z')
  });

  assert.equal(result.allowed, true);
  if (result.allowed) {
    assert.equal(result.policy, 'ten_percent_after_five_minutes');
    assert.equal(result.charge, 50);
    assert.equal(result.partnerCredit, 42.5);
    assert.equal(result.platformCommission, 7.5);
  }
});

test('delivered and already-cancelled orders cannot be cancelled', () => {
  for (const status of ['delivered', 'cancelled']) {
    assert.equal(calculateCustomerCancellation({ status, total: 500 }).allowed, false);
  }
});

test('prepaid cancellation refund does not refund separately coin-funded waiting charges', () => {
  assert.deepEqual(calculateCancellationPayment({
    cancellationCharge: 12,
    currentOrderTotal: 120,
    waitingCharge: 20,
    prepaid: true
  }), {
    prepaidCapturedAmount: 100,
    retainedFromPrepaid: 12,
    refundAmount: 88,
    coinCharge: 0
  });
});

test('any cancellation fee not covered by prepaid cash remains a coin charge', () => {
  assert.deepEqual(calculateCancellationPayment({
    cancellationCharge: 10,
    currentOrderTotal: 30,
    waitingCharge: 30,
    prepaid: true
  }), {
    prepaidCapturedAmount: 0,
    retainedFromPrepaid: 0,
    refundAmount: 0,
    coinCharge: 10
  });
});
