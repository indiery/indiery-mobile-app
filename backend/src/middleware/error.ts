import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, 'Route not found'));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed',
      issues: error.issues
    });
  }

  if (error instanceof ApiError) {
    return res.status(error.status).json({ message: error.message });
  }

  if (env.NODE_ENV === 'production') {
    console.error(error);
    return res.status(500).json({ message: 'Unexpected server error' });
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error';
  return res.status(500).json({ message });
}

export function asyncRoute<T extends Request>(
  handler: (req: T, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: T, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}
