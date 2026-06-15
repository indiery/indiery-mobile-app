import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { authRouter } from './routes/auth.routes';
import { customerRouter } from './routes/customer.routes';
import { partnerRouter } from './routes/partner.routes';
import { metaRouter } from './routes/meta.routes';
import { uploadRouter } from './routes/upload.routes';
import { paymentRouter } from './routes/payment.routes';
import { errorHandler, notFound } from './middleware/error';

const requestBuckets = new Map<string, { count: number; resetAt: number }>();

function corsOrigin() {
  if (env.CORS_ORIGIN === '*') return true;
  return env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
}

function rateLimit(windowMs = 60_000, maxRequests = 180) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path === '/health') return next();
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const bucket = requestBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      requestBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > maxRequests) return res.status(429).json({ message: 'Too many requests' });
    return next();
  };
}

export function createApp() {
  const app = express();
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: corsOrigin(), credentials: true }));
  app.use(rateLimit());
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use('/api/payments', express.raw({ type: 'application/json' }), paymentRouter);
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'indiery-api' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/meta', metaRouter);
  app.use('/api/customer', customerRouter);
  app.use('/api/partner', partnerRouter);
  app.use('/api/uploads', uploadRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
