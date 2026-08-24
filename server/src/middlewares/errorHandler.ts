import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export const notFoundHandler: RequestHandler = (req: Request, _res: Response) => {
  throw new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`);
};

export const errorHandler: ErrorRequestHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ success: false, message: err.message, errors: err.details });
    return;
  }

  const anyErr = err as { name?: string; message?: string; status?: number; code?: number };
  if (typeof anyErr?.name === 'string' && anyErr.name.startsWith('Stripe')) {
    res.status(502).json({ success: false, message: `Payment provider error: ${anyErr.message ?? 'unknown'}` });
    return;
  }
  if (anyErr?.name === 'CastError') {
    res.status(400).json({ success: false, message: 'Invalid identifier format' });
    return;
  }
  if (anyErr?.name === 'ValidationError') {
    res.status(400).json({ success: false, message: 'Validation failed', errors: anyErr.message });
    return;
  }
  if (anyErr?.code === 11000) {
    console.error('[db] duplicate key:', JSON.stringify((anyErr as { keyPattern?: unknown }).keyPattern ?? anyErr.message));
    res.status(409).json({ success: false, message: 'A record with those values already exists' });
    return;
  }
  if (typeof anyErr?.status === 'number' && anyErr.status >= 400 && anyErr.status < 500) {
    res.status(anyErr.status).json({ success: false, message: anyErr.message ?? 'Bad request' });
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal Server Error';
  console.error('[error]', err);
  res.status(500).json({ success: false, message });
};
