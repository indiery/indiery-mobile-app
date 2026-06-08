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
import { errorHandler, notFound } from './middleware/error';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '5mb' }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

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
