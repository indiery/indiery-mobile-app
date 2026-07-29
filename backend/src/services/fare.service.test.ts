import assert from 'node:assert/strict';
import test from 'node:test';
import type { VehicleDocument } from '../models/Vehicle';
import { applyWaitingChargeToFare, estimateFare } from './fare.service';

function vehicle(code: string) {
  return {
    code,
    serviceType: 'intracity',
    baseFare: 40,
    perKm: 10,
    etaMinutes: 10
  } as VehicleDocument;
}

function initialFare(code: string) {
  return estimateFare({
    pickup: 'Pickup',
    drop: 'Drop',
    vehicle: vehicle(code),
    distanceKm: 1
  });
}

test('bike waiting is free for 5 minutes and then costs 2 per started minute', () => {
  const atLimit = applyWaitingChargeToFare({
    fare: initialFare('bike'),
    distanceKm: 1,
    vehicle: vehicle('bike'),
    waitingMinutes: 5
  });
  const afterLimit = applyWaitingChargeToFare({
    fare: initialFare('bike'),
    distanceKm: 1,
    vehicle: vehicle('bike'),
    waitingMinutes: 6.01
  });

  assert.equal(atLimit.waitingCharge, 0);
  assert.equal(afterLimit.waitingFreeMinutes, 5);
  assert.equal(afterLimit.billableWaitingMinutes, 2);
  assert.equal(afterLimit.waitingCharge, 4);
});

test('all three cargo vehicles are free for 30 minutes and then cost 5 per minute', () => {
  for (const code of ['loader90', 'mini500', 'mini750']) {
    const fare = applyWaitingChargeToFare({
      fare: initialFare(code),
      distanceKm: 1,
      vehicle: vehicle(code),
      waitingMinutes: 31
    });

    assert.equal(fare.waitingFreeMinutes, 30, code);
    assert.equal(fare.waitingPerMinute, 5, code);
    assert.equal(fare.billableWaitingMinutes, 1, code);
    assert.equal(fare.waitingCharge, 5, code);
  }
});

test('waiting charges use the same partner, platform, and reserve split as the fare', () => {
  const fare = applyWaitingChargeToFare({
    fare: initialFare('loader90'),
    distanceKm: 1,
    vehicle: vehicle('loader90'),
    waitingMinutes: 31
  });

  assert.equal(fare.orderValue, 40);
  assert.equal(fare.waitingCharge, 5);
  assert.equal(fare.driverCommission, 36);
  assert.equal(fare.platformCommission, 6.75);
  assert.equal(fare.reserveAmount, 2.25);
  assert.equal(fare.onTimePartnerPayout, 38.25);
  assert.equal(fare.total, 45);
});
