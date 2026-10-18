import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiRouter } from './routes';
import { AppError } from './shared/errors/AppError';
import { logger } from './shared/logger';

export function createApp() {
  const app = express();

  // Needed so rate limiting sees the real client IP behind a hosting proxy.
  app.set('trust proxy', env.NODE_ENV === 'production' ? 1 : false);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    }),
  );
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: '100kb' }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler: (_req, _res, next) => next(AppError.tooManyRequests()),
    }),
  );

  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}