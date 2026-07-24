import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export const requestLogger = (req: Request, _res: Response, next: NextFunction): void => {
  logger.info(`${req.method} ${req.originalUrl} | Client IP: ${req.ip}`);
  next();
};
export default requestLogger;
