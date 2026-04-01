import type { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  status?: number;
}

/**
 * Catch-all error handler returning JSON { error, status }.
 */
export function errorHandler(err: ApiError, _req: Request, res: Response, _next: NextFunction): void {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error', status });
}
