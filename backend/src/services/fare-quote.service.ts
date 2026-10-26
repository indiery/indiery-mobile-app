import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../middleware/error';
import type { RouteMetrics } from './maps.service';

const FARE_QUOTE_AUDIENCE = 'indiery-customer-order';
const FARE_QUOTE_ISSUER = 'indiery-api';
const FARE_QUOTE_TTL_SECONDS = 5 * 60;

export interface FareQuoteInput {
  pickup: string;
  drop: string;
  vehicleId: string;
  coins: number;
  weightKg: number;
  extraStops?: Array<{
    label: string;
    address?: string;
    lat?: number;
    lng?: number;
  }>;
  pickupLat?: number;
  pickupLng?: number;
  dropLat?: number;
  dropLng?: number;
}

interface FareQuotePayload extends jwt.JwtPayload {
  kind: 'fare_quote';
  inputHash: string;
  distanceKm: number;
  durationMinutes?: number;
  source: RouteMetrics['source'];
}

function normalizedText(value: string | undefined) {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizedNumber(value: number | undefined, precision = 6) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Number(value.toFixed(precision));
}

function fareQuoteInputHash(input: FareQuoteInput) {
  const normalized = {
    pickup: normalizedText(input.pickup),
    drop: normalizedText(input.drop),
    vehicleId: input.vehicleId.trim(),
    coins: normalizedNumber(input.coins, 2),
    weightKg: normalizedNumber(input.weightKg, 3),
    extraStops: (input.extraStops ?? []).map((stop) => ({
      label: normalizedText(stop.label),
      address: normalizedText(stop.address),
      lat: normalizedNumber(stop.lat),
      lng: normalizedNumber(stop.lng)
    })),
    pickupLat: normalizedNumber(input.pickupLat),
    pickupLng: normalizedNumber(input.pickupLng),
    dropLat: normalizedNumber(input.dropLat),
    dropLng: normalizedNumber(input.dropLng)
  };
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('base64url');
}

export function createFareQuote(userId: string, input: FareQuoteInput, metrics: RouteMetrics) {
  return jwt.sign(
    {
      kind: 'fare_quote',
      inputHash: fareQuoteInputHash(input),
      distanceKm: metrics.distanceKm,
      durationMinutes: metrics.durationMinutes,
      source: metrics.source
    },
    env.JWT_SECRET,
    {
      subject: userId,
      audience: FARE_QUOTE_AUDIENCE,
      issuer: FARE_QUOTE_ISSUER,
      expiresIn: FARE_QUOTE_TTL_SECONDS
    }
  );
}

export function verifyFareQuote(token: string, userId: string, input: FareQuoteInput): RouteMetrics {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      audience: FARE_QUOTE_AUDIENCE,
      issuer: FARE_QUOTE_ISSUER
    }) as FareQuotePayload;

    if (
      payload.kind !== 'fare_quote' ||
      payload.sub !== userId ||
      payload.inputHash !== fareQuoteInputHash(input) ||
      typeof payload.distanceKm !== 'number' ||
      !Number.isFinite(payload.distanceKm) ||
      payload.distanceKm <= 0 ||
      (payload.durationMinutes !== undefined &&
        (typeof payload.durationMinutes !== 'number' ||
          !Number.isFinite(payload.durationMinutes) ||
          payload.durationMinutes <= 0)) ||
      !['google_directions', 'google_distance_matrix', 'fallback'].includes(payload.source)
    ) {
      throw new Error('Invalid fare quote');
    }

    return {
      distanceKm: payload.distanceKm,
      durationMinutes: payload.durationMinutes,
      source: payload.source
    };
  } catch {
    throw new ApiError(409, 'Fare estimate expired. Please refresh the fare and try again.');
  }
}
