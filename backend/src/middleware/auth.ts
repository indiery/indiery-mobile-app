import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from './error';
import { User } from '../models/User';

export type AuthRole = 'customer' | 'partner' | 'admin';

export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    role: AuthRole;
  };
}

export function signToken(userId: string, role: AuthRole) {
  return jwt.sign({ sub: userId, role }, env.JWT_SECRET, { expiresIn: '30d' });
}

export function requireAuth(roles?: AuthRole[]) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) throw new ApiError(401, 'Missing auth token');
      const token = header.slice('Bearer '.length);
      const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; role: AuthRole };
      if (roles?.length && !roles.includes(payload.role)) throw new ApiError(403, 'Forbidden');
      const user = await User.findById(payload.sub).select('_id role status');
      if (!user || user.status !== 'active') throw new ApiError(401, 'Invalid user');
      req.auth = { userId: String(user._id), role: user.role as AuthRole };
      next();
    } catch (error) {
      next(error);
    }
  };
}
