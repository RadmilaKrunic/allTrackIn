import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  status?: number;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error(err.stack);
  const status = err.status ?? 500;
  res.status(status).json({
    error: { message: err.message || 'Internal Server Error', status },
  });
};

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  const err: AppError = new Error(`Not Found - ${req.originalUrl}`);
  err.status = 404;
  next(err);
};
