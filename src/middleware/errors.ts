import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: { message: 'Invalid request', details: error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })) } });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { message: error.message } });
    return;
  }
  if (error?.code === 11000) {
    res.status(409).json({ error: { message: 'Email is already registered' } });
    return;
  }
  if (error?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { message: 'Request body must be valid JSON' } });
    return;
  }
  if (error?.type === 'entity.too.large') {
    res.status(413).json({ error: { message: 'Request body is too large' } });
    return;
  }
  console.error(error);
  res.status(500).json({ error: { message: 'Internal server error' } });
};
