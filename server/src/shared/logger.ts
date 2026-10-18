import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  // Never log credentials.
  redact: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password'],
});