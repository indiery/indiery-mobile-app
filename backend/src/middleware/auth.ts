import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from './error';
import { User } from '../models/User';
import { AdminIdentity } from '../models/AdminIdentity';

export type AuthRole = 'customer' | 'partner' | 'admin';
export const ADMIN_SESSION_COOKIE = 'indiery_admin_session';

export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    role: AuthRole;
    adminRoleKey?: string;
    cityScope?: string[];
  };
}

export function signToken(userId: string, role: AuthRole) {
  const expiresIn = role === 'admin' ? 8 * 60 * 60 : 30 * 24 * 60 * 60;
  return jwt.sign({ sub: userId, role }, env.JWT_SECRET, { expiresIn });
}

function readCookie(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return undefined;
}

export async function verifyAuthToken(token: string) {
  const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; role: AuthRole };
  const user = await User.findById(payload.sub).select('_id role status email');
  if (!user || user.status !== 'active') throw new ApiError(401, 'Invalid user');
  if (user.role !== 'admin') return { userId: String(user._id), role: user.role as AuthRole };

  const identity = await AdminIdentity.findOne({ user: user._id }).select('roleKey cityScope status').lean();
  if (!identity || identity.status !== 'active') throw new ApiError(401, 'Administrator access is no longer active');
  return {
    userId: String(user._id),
    role: 'admin' as const,
    adminRoleKey: identity.roleKey,
    cityScope: identity.cityScope ?? []
  };
}

export function requireAuth(roles?: AuthRole[]) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization;
      const token = header?.startsWith('Bearer ')
        ? header.slice('Bearer '.length)
        : readCookie(req.headers.cookie, ADMIN_SESSION_COOKIE);
      if (!token) throw new ApiError(401, 'Authentication required');
      const auth = await verifyAuthToken(token);
      if (roles?.length && !roles.includes(auth.role)) throw new ApiError(403, 'Forbidden');
      req.auth = auth;
      next();
    } catch (error) {
      if (
        error instanceof Error &&
        ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)
      ) {
        next(new ApiError(401, 'Session is invalid or expired'));
        return;
      }
      next(error);
    }
  };
}
