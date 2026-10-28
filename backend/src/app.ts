import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { authRouter } from './routes/auth.routes';
import { customerRouter } from './routes/customer.routes';
import { partnerRouter } from './routes/partner.routes';
import { metaRouter } from './routes/meta.routes';
import { mapsRouter } from './routes/maps.routes';
import { uploadRouter } from './routes/upload.routes';
import { paymentRouter } from './routes/payment.routes';
import { legalRouter } from './routes/legal.routes';
import { trackingRouter } from './routes/tracking.routes';
import { adminRouter } from './routes/admin.routes';
import { errorHandler, notFound } from './middleware/error';
import { createRateLimit } from './middleware/rateLimit';

function corsOrigin() {
  if (env.CORS_ORIGIN === '*') return true;
  return env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
}

const standardApiRateLimit = createRateLimit({ windowMs: 60_000, maxRequests: 180 });
const adminAuthRateLimit = createRateLimit({ windowMs: 60_000, maxRequests: 120 });
const adminApiIngressRateLimit = createRateLimit({ windowMs: 60_000, maxRequests: 600 });

function scopedRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.path === '/health') return next();
  if (req.path.startsWith('/api/admin')) return adminApiIngressRateLimit(req, res, next);
  if (req.path.startsWith('/api/auth/admin-')) return adminAuthRateLimit(req, res, next);
  return standardApiRateLimit(req, res, next);
}

function skipSensitiveTrackingLogs(req: express.Request) {
  return req.path.startsWith('/track/share/') || req.path.startsWith('/t/');
}

export function createApp() {
  const app = express();
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: corsOrigin(), credentials: true }));
  app.use(scopedRateLimit);
  app.use(
    morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
      skip: skipSensitiveTrackingLogs
    })
  );
  app.use('/api/payments', express.raw({ type: 'application/json' }), paymentRouter);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '50kb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'indiery-api' });
  });

  app.get(['/admin', '/admin/*', '/adnin', '/adnin/*'], (req, res) => {
    res.redirect(308, `https://www.indiery.com${req.originalUrl}`);
  });

  app.use(legalRouter);
  app.use(trackingRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/meta', metaRouter);
  app.use('/api/maps', mapsRouter);
  app.use('/api/customer', customerRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/partner', partnerRouter);
  app.use('/api/uploads', uploadRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
