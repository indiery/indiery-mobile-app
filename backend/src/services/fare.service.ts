import type { VehicleDocument } from '../models/Vehicle';

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

export function estimateFare(input: EstimateInput) {
  const distanceKm = Number((input.distanceKm ?? stableDistanceKm(input.pickup, input.drop)).toFixed(1));
  const distance = Math.round(distanceKm * input.vehicle.perKm);
  const base = input.vehicle.baseFare;
  const subtotal = base + distance;
  const gst = Math.round(subtotal * 0.18);
  const requestedCoins = Math.max(0, input.coins ?? 0);
  const walletCoins = Math.max(0, input.customerCoins ?? 0);
  const coins = Math.min(walletCoins, requestedCoins, subtotal);
  const total = subtotal + gst - coins;
  const partnerNet = Number((subtotal * input.vehicle.partnerShare).toFixed(2));
  const platformCommission = Number((subtotal - partnerNet).toFixed(2));

  return {
    distanceKm,
    base,
    distance,
    gst,
    coins,
    total,
    partnerNet,
    platformCommission,
    etaMinutes: input.vehicle.etaMinutes + Math.round(distanceKm / 2)
  };
}
