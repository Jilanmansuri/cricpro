import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction): void => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Log the error stack traces internally
  logger.error(`Express error handler caught exception: ${err.message || err}`, err);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
export default errorHandler;
