import type { NextFunction, Request, RequestHandler, Response } from 'express';

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
};

type RequestBucket = {
  count: number;
  resetAt: number;
};

function requestIp(req: Request) {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function createRateLimit({
  windowMs,
  maxRequests,
  keyGenerator = requestIp,
  message = 'Too many requests. Please try again shortly.'
}: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, RequestBucket>();
  let nextSweepAt = Date.now() + windowMs;

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    if (now >= nextSweepAt) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
      nextSweepAt = now + windowMs;
    }

    const key = keyGenerator(req);
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, maxRequests - bucket.count);
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    res.setHeader('RateLimit-Limit', String(maxRequests));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(retryAfterSeconds));

    if (bucket.count > maxRequests) {
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({ message, retryAfterSeconds });
    }

    return next();
  };
}
