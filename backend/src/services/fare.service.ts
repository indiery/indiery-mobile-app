import type { VehicleDocument } from '../models/Vehicle';

const DRIVER_COMMISSION_RATE = 0.8;
const PLATFORM_COMMISSION_RATE = 0.15;
const RESERVE_RATE = 0.05;
const DELAY_PENALTY_RATE = 0.05;
const BIKE_WAITING_FREE_MINUTES = 10;
const BIKE_WAITING_PER_MINUTE = 2;

export interface EstimateInput {
  pickup: string;
  drop: string;
  vehicle: VehicleDocument;
  weightKg?: number;
  coins?: number;
  customerCoins?: number;
  distanceKm?: number;
}

export function stableDistanceKm(pickup: string, drop: string) {
  const text = `${pickup}|${drop}`.toLowerCase();
  let hash = 17;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 1009;
  }
  return Number((2.5 + (hash % 120) / 10).toFixed(1));
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export function normalizeFareBreakup(fareInput: unknown, distanceKmInput: unknown) {
  const fare = (fareInput ?? {}) as Record<string, number | undefined>;
  const distanceKm = typeof distanceKmInput === 'number' ? distanceKmInput : Number(distanceKmInput || 0);
  const base = fare.base ?? 0;
  const distance = fare.distance ?? 0;
  const orderValue = fare.orderValue ?? base + distance;
  const waitingCharge = fare.waitingCharge ?? 0;
  const waitingMinutes = fare.waitingMinutes ?? 0;
  const billableWaitingMinutes = fare.billableWaitingMinutes ?? Math.max(0, waitingMinutes - (fare.waitingFreeMinutes ?? 0));
  const gst = fare.gst ?? Math.round(orderValue * 0.18);
  const coins = fare.coins ?? 0;
  const driverCommission = fare.driverCommission ?? roundMoney(orderValue * DRIVER_COMMISSION_RATE);
  const platformCommission = fare.platformCommission ?? roundMoney(orderValue * PLATFORM_COMMISSION_RATE);
  const reserveAmount = fare.reserveAmount ?? roundMoney(orderValue * RESERVE_RATE);
  const lateDriverPenalty = fare.lateDriverPenalty ?? roundMoney(driverCommission * DELAY_PENALTY_RATE);
  const latePlatformPenalty = fare.latePlatformPenalty ?? roundMoney(platformCommission * DELAY_PENALTY_RATE);
  const lateRefundCoins = fare.lateRefundCoins ?? roundMoney(lateDriverPenalty + latePlatformPenalty + reserveAmount);
  const onTimePartnerPayout = fare.onTimePartnerPayout ?? roundMoney(driverCommission + reserveAmount);
  const latePartnerPayout = fare.latePartnerPayout ?? roundMoney(driverCommission - lateDriverPenalty);

  return {
    distanceKm,
    billableKm: fare.billableKm ?? Math.max(1, Math.ceil(distanceKm)),
    orderValue,
    base,
    distance,
    waitingCharge,
    waitingMinutes,
    billableWaitingMinutes,
    waitingFreeMinutes: fare.waitingFreeMinutes,
    waitingPerMinute: fare.waitingPerMinute,
    gst,
    coins,
    total: fare.total ?? orderValue + waitingCharge + gst - coins,
    driverCommission,
    reserveAmount,
    partnerNet: fare.partnerNet ?? onTimePartnerPayout,
    platformCommission,
    lateDriverPenalty,
    latePlatformPenalty,
    lateRefundCoins,
    onTimePartnerPayout,
    latePartnerPayout
  };
}

function isIntercityVehicle(vehicle: VehicleDocument) {
  return vehicle.serviceType === 'intercity' || vehicle.code.startsWith('truck');
}

function waitingPolicyForVehicle(vehicle: VehicleDocument) {
  if (vehicle.code !== 'bike') return {};
  return {
    waitingCharge: 0,
    waitingMinutes: 0,
    billableWaitingMinutes: 0,
    waitingFreeMinutes: BIKE_WAITING_FREE_MINUTES,
    waitingPerMinute: BIKE_WAITING_PER_MINUTE
  };
}

export function applyWaitingChargeToFare(input: {
  fare: unknown;
  distanceKm: number;
  vehicle: VehicleDocument;
  waitingMinutes: number;
}) {
  const normalized = normalizeFareBreakup(input.fare, input.distanceKm);
  const waitingPolicy = waitingPolicyForVehicle(input.vehicle);
  if (typeof waitingPolicy.waitingFreeMinutes !== 'number' || typeof waitingPolicy.waitingPerMinute !== 'number') {
    return normalized;
  }

  const waitingMinutes = Math.max(0, Math.ceil(input.waitingMinutes));
  const billableWaitingMinutes = Math.max(0, waitingMinutes - waitingPolicy.waitingFreeMinutes);
  const waitingCharge = roundMoney(billableWaitingMinutes * waitingPolicy.waitingPerMinute);
  const payoutWithWaiting = roundMoney(normalized.onTimePartnerPayout + waitingCharge);
  const latePayoutWithWaiting = roundMoney(normalized.latePartnerPayout + waitingCharge);

  return normalizeFareBreakup(
    {
      ...normalized,
      waitingCharge,
      waitingMinutes,
      billableWaitingMinutes,
      waitingFreeMinutes: waitingPolicy.waitingFreeMinutes,
      waitingPerMinute: waitingPolicy.waitingPerMinute,
      total: roundMoney(normalized.orderValue + waitingCharge + normalized.gst - normalized.coins),
      partnerNet: payoutWithWaiting,
      onTimePartnerPayout: payoutWithWaiting,
      latePartnerPayout: latePayoutWithWaiting
    },
    input.distanceKm
  );
}

export function estimateFare(input: EstimateInput) {
  const distanceKm = Number((input.distanceKm ?? stableDistanceKm(input.pickup, input.drop)).toFixed(1));
  const billableKm = Math.max(1, Math.ceil(distanceKm));
  const intercity = isIntercityVehicle(input.vehicle);
  const base = intercity ? 0 : input.vehicle.baseFare;
  const additionalKm = intercity ? billableKm : Math.max(0, billableKm - 1);
  const distance = Math.round(additionalKm * input.vehicle.perKm);
  const orderValue = base + distance;
  const subtotal = orderValue;
  const gst = Math.round(subtotal * 0.18);
  const requestedCoins = Math.max(0, input.coins ?? 0);
  const walletCoins = Math.max(0, input.customerCoins ?? 0);
  const coins = Math.min(walletCoins, requestedCoins, subtotal);
  const waitingPolicy = waitingPolicyForVehicle(input.vehicle);
  const total = subtotal + (waitingPolicy.waitingCharge ?? 0) + gst - coins;
  const driverCommission = roundMoney(subtotal * DRIVER_COMMISSION_RATE);
  const platformCommission = roundMoney(subtotal * PLATFORM_COMMISSION_RATE);
  const reserveAmount = roundMoney(subtotal * RESERVE_RATE);
  const lateDriverPenalty = roundMoney(driverCommission * DELAY_PENALTY_RATE);
  const latePlatformPenalty = roundMoney(platformCommission * DELAY_PENALTY_RATE);
  const lateRefundCoins = roundMoney(lateDriverPenalty + latePlatformPenalty + reserveAmount);
  const onTimePartnerPayout = roundMoney(driverCommission + reserveAmount);
  const latePartnerPayout = roundMoney(driverCommission - lateDriverPenalty);

  return {
    ...normalizeFareBreakup(
      {
        billableKm,
        orderValue,
        base,
        distance,
        ...waitingPolicy,
        gst,
        coins,
        total,
        driverCommission,
        reserveAmount,
        partnerNet: onTimePartnerPayout,
        platformCommission,
        lateDriverPenalty,
        latePlatformPenalty,
        lateRefundCoins,
        onTimePartnerPayout,
        latePartnerPayout
      },
      distanceKm
    ),
    etaMinutes: input.vehicle.etaMinutes + Math.round(distanceKm / 2)
  };
}
