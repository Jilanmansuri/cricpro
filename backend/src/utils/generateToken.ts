import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

export const generateToken = (id: Types.ObjectId): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecret', {
    expiresIn: (process.env.JWT_EXPIRE || '30d') as any,
  });
};
