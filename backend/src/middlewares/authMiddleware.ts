import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { IUser } from '../types';

export interface AuthRequest extends Request {
  user?: IUser;
}

const userRepository = new UserRepository();

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verify access token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret') as { id: string };

      const user = await userRepository.findById(decoded.id);
      if (!user) {
        res.status(401).json({ success: false, message: 'Not authorized: User not found' });
        return;
      }

      if (user.status === 'inactive') {
        res.status(401).json({ success: false, message: 'Not authorized: User account is inactive' });
        return;
      }

      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ success: false, message: 'Not authorized: Access token invalid or expired' });
    }
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized: Token missing' });
  }
};

// Role-based authorization middleware
export const authorize = (...roles: ('admin' | 'manager' | 'player')[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: `Forbidden: User role '${req.user.role}' is not authorized to access this resource` });
      return;
    }

    next();
  };
};
