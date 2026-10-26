import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

const trackingAudience = 'indiery-shared-tracking';
const trackingIssuer = 'indiery-api';
const trackingPurpose = 'order_tracking';
const trackingTokenLifetimeSeconds = 24 * 60 * 60;
const trackingClockSkewSeconds = 60;
const compactTokenDomain = Buffer.from('indiery:tracking:compact:v1\0', 'utf8');
const compactTokenKey = crypto
  .createHmac('sha256', env.JWT_SECRET)
  .update('indiery:tracking:key:v1\0')
  .digest();
const compactTokenTagLength = 16;
const compactOrderNoTokenLength = 25;
const compactOrderIdTokenLength = 33;
const compactOrderNoHeader = 0x10;
const compactOrderIdHeader = 0x20;

interface TrackingTokenPayload {
  purpose: typeof trackingPurpose;
  orderId: string;
  orderNo: string;
}

export type TrackingTokenClaims =
  | { orderNo: string; orderId?: never }
  | { orderId: string; orderNo?: never }
  | { orderId: string; orderNo: string };

function compactTokenTag(payload: Buffer) {
  return crypto
    .createHmac('sha256', compactTokenKey)
    .update(compactTokenDomain)
    .update(payload)
    .digest()
    .subarray(0, compactTokenTagLength);
}

function encodeCompactToken(payload: Buffer) {
  return Buffer.concat([payload, compactTokenTag(payload)]).toString('base64url');
}

function createCompactOrderNoToken(orderNo: string, expiresAt: number) {
  const match = /^IND-([1-9]\d*)$/.exec(orderNo);
  if (!match) return undefined;
  const counter = Number(match[1]);
  if (!Number.isSafeInteger(counter) || counter > 0xffffffff) return undefined;

  const payload = Buffer.alloc(9);
  payload[0] = compactOrderNoHeader;
  payload.writeUInt32BE(expiresAt, 1);
  payload.writeUInt32BE(counter, 5);
  return encodeCompactToken(payload);
}

function createCompactOrderIdToken(orderId: string, expiresAt: number) {
  if (!/^[a-f\d]{24}$/i.test(orderId)) return undefined;
  const payload = Buffer.alloc(17);
  payload[0] = compactOrderIdHeader;
  payload.writeUInt32BE(expiresAt, 1);
  Buffer.from(orderId, 'hex').copy(payload, 5);
  return encodeCompactToken(payload);
}

export function createTrackingToken(orderId: string, orderNo: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + trackingTokenLifetimeSeconds;
  const compactToken =
    createCompactOrderNoToken(orderNo, expiresAt) ??
    createCompactOrderIdToken(orderId, expiresAt);
  if (compactToken) return compactToken;

  return jwt.sign(
    { purpose: trackingPurpose, orderId, orderNo } satisfies TrackingTokenPayload,
    env.JWT_SECRET,
    {
      algorithm: 'HS256',
      audience: trackingAudience,
      issuer: trackingIssuer,
      expiresIn: trackingTokenLifetimeSeconds
    }
  );
}

function verifyCompactTrackingToken(token: string): TrackingTokenClaims | undefined {
  if (
    ![34, 44].includes(token.length) ||
    !/^[A-Za-z0-9_-]+$/.test(token)
  ) {
    return undefined;
  }

  const raw = Buffer.from(token, 'base64url');
  if (
    ![compactOrderNoTokenLength, compactOrderIdTokenLength].includes(raw.length) ||
    raw.toString('base64url') !== token
  ) {
    return undefined;
  }

  const payload = raw.subarray(0, raw.length - compactTokenTagLength);
  const providedTag = raw.subarray(raw.length - compactTokenTagLength);
  const expectedTag = compactTokenTag(payload);
  if (!crypto.timingSafeEqual(providedTag, expectedTag)) return undefined;

  const expiresAt = payload.readUInt32BE(1);
  const now = Math.floor(Date.now() / 1000);
  if (
    expiresAt <= now - trackingClockSkewSeconds ||
    expiresAt > now + trackingTokenLifetimeSeconds + trackingClockSkewSeconds
  ) {
    return undefined;
  }

  if (raw.length === compactOrderNoTokenLength && payload[0] === compactOrderNoHeader) {
    const counter = payload.readUInt32BE(5);
    return counter > 0 ? { orderNo: `IND-${counter}` } : undefined;
  }

  if (raw.length === compactOrderIdTokenLength && payload[0] === compactOrderIdHeader) {
    return { orderId: payload.subarray(5, 17).toString('hex') };
  }

  return undefined;
}

function verifyLegacyTrackingToken(token: string): TrackingTokenClaims | undefined {
  if (token.length > 1024 || token.split('.').length !== 3) return undefined;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      audience: trackingAudience,
      issuer: trackingIssuer
    }) as jwt.JwtPayload & Partial<TrackingTokenPayload>;

    if (
      payload.purpose !== trackingPurpose ||
      typeof payload.orderId !== 'string' ||
      typeof payload.orderNo !== 'string'
    ) {
      return undefined;
    }

    return {
      orderId: payload.orderId,
      orderNo: payload.orderNo
    };
  } catch {
    return undefined;
  }
}

export function verifyTrackingToken(token: string): TrackingTokenClaims | undefined {
  return verifyCompactTrackingToken(token) ?? verifyLegacyTrackingToken(token);
}
