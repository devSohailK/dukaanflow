import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors/AppError';
import { logger } from '../shared/logger';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Route not found: ${req.method} ${req.path}`));
};

function isHttpError(err: unknown): err is { status: number; type?: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    typeof (err as { status?: unknown }).status === 'number'
  );
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong';
  let details: unknown;

  if (err instanceof AppError) {
    status = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid request data';
    details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    code = 'INVALID_ID';
    message = 'Invalid identifier';
  } else if (isDuplicateKeyError(err)) {
    status = 409;
    code = 'DUPLICATE';
    message = 'A record with the same value already exists';
  } else if (isHttpError(err) && err.status >= 400 && err.status < 500) {
    // Errors raised by Express/body-parser (bad JSON, payload too large, ...)
    status = err.status;
    if (err.type === 'entity.parse.failed') {
      code = 'INVALID_JSON';
      message = 'Request body is not valid JSON';
    } else if (err.type === 'entity.too.large') {
      code = 'PAYLOAD_TOO_LARGE';
      message = 'Request body is too large';
    } else {
      code = 'BAD_REQUEST';
      message = 'Bad request';
    }
  }

  if (status >= 500) {
    // Log the real error server-side, but never expose it to the client.
    logger.error({ err, method: req.method, path: req.path }, 'Unhandled error');
  }

  res.status(status).json({ error: { code, message, ...(details !== undefined && { details }) } });
};