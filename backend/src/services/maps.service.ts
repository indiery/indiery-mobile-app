import { env } from '../config/env';
import { stableDistanceKm } from './fare.service';

export interface DistanceInput {
  pickup: string;
  drop: string;
  pickupLat?: number;
  pickupLng?: number;
  dropLat?: number;
  dropLng?: number;
}

function coordinatePair(lat?: number, lng?: number) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return undefined;
  return `${lat},${lng}`;
}

export async function resolveDistanceKm(input: DistanceInput) {
  const fallback = stableDistanceKm(input.pickup, input.drop);
  if (!env.GOOGLE_MAPS_API_KEY) return fallback;

  const origin = coordinatePair(input.pickupLat, input.pickupLng) ?? input.pickup;
  const destination = coordinatePair(input.dropLat, input.dropLng) ?? input.drop;
  const params = new URLSearchParams({
    origins: origin,
    destinations: destination,
    units: 'metric',
    key: env.GOOGLE_MAPS_API_KEY
  });

  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`);
    if (!response.ok) return fallback;
    const payload = (await response.json()) as {
      rows?: Array<{ elements?: Array<{ status?: string; distance?: { value?: number } }> }>;
    };
    const meters = payload.rows?.[0]?.elements?.[0]?.distance?.value;
    if (!meters || payload.rows?.[0]?.elements?.[0]?.status !== 'OK') return fallback;
    return Number(Math.max(0.5, meters / 1000).toFixed(1));
  } catch {
    return fallback;
  }
}
