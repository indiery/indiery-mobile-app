import jwt from 'jsonwebtoken';
import { env } from '../config/env';

const trackingAudience = 'indiery-shared-tracking';
const trackingIssuer = 'indiery-api';
const trackingPurpose = 'order_tracking';

interface TrackingTokenPayload {
  purpose: typeof trackingPurpose;
  orderId: string;
  orderNo: string;
}

export function createTrackingToken(orderId: string, orderNo: string) {
  return jwt.sign(
    {
      purpose: trackingPurpose,
      orderId,
      orderNo
    } satisfies TrackingTokenPayload,
    env.JWT_SECRET,
    {
      algorithm: 'HS256',
      audience: trackingAudience,
      issuer: trackingIssuer,
      expiresIn: '24h'
    }
  );
}

export function verifyTrackingToken(token: string): TrackingTokenPayload | undefined {
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
      purpose: trackingPurpose,
      orderId: payload.orderId,
      orderNo: payload.orderNo
    };
  } catch {
    return undefined;
  }
}
