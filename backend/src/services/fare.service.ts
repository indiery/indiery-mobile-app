import type { VehicleDocument } from '../models/Vehicle';

const DRIVER_COMMISSION_RATE = 0.8;
const PLATFORM_COMMISSION_RATE = 0.15;
const RESERVE_RATE = 0.05;
const DELAY_PENALTY_RATE = 0.05;

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

function isIntercityVehicle(vehicle: VehicleDocument) {
  return vehicle.serviceType === 'intercity' || vehicle.code.startsWith('truck');
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
  const total = subtotal + gst - coins;
  const driverCommission = roundMoney(subtotal * DRIVER_COMMISSION_RATE);
  const platformCommission = roundMoney(subtotal * PLATFORM_COMMISSION_RATE);
  const reserveAmount = roundMoney(subtotal * RESERVE_RATE);
  const lateDriverPenalty = roundMoney(driverCommission * DELAY_PENALTY_RATE);
  const latePlatformPenalty = roundMoney(platformCommission * DELAY_PENALTY_RATE);
  const lateRefundCoins = roundMoney(lateDriverPenalty + latePlatformPenalty + reserveAmount);
  const onTimePartnerPayout = roundMoney(driverCommission + reserveAmount);
  const latePartnerPayout = roundMoney(driverCommission - lateDriverPenalty);

  return {
    distanceKm,
    billableKm,
    orderValue,
    base,
    distance,
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
    latePartnerPayout,
    etaMinutes: input.vehicle.etaMinutes + Math.round(distanceKm / 2)
  };
}
