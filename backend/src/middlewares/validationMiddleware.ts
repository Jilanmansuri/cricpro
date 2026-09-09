import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const validateFields = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array().map(err => ({
      field: err.type === 'field' ? err.path : err.type,
      message: err.msg
    }));
    res.status(400).json({
      success: false,
      message: errorList[0]?.message || 'Validation failed',
      errors: errorList
    });
    return;
  }
  next();
};
