import BaseRepository from './BaseRepository';
import { User } from '../models/User';
import { IUser } from '../types';

export class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(User);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const trimmed = (email || '').trim();
    return await this.model.findOne({
      $or: [
        { email: trimmed.toLowerCase() },
        { email: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      ]
    }).select('+password').exec();
  }

  async findByUsernameOrEmail(username: string, email: string): Promise<IUser | null> {
    const uTrim = (username || '').trim();
    const eTrim = (email || '').trim();
    const uRegex = new RegExp(`^${uTrim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const eRegex = new RegExp(`^${eTrim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

    return await this.model.findOne({
      $or: [
        { email: eTrim.toLowerCase() },
        { email: eRegex },
        { username: uTrim },
        { username: uRegex }
      ]
    }).select('+password').exec();
  }

  async updateRefreshToken(id: string, token: string | null): Promise<void> {
    await this.model.findByIdAndUpdate(id, { refreshToken: token || undefined }).exec();
  }

  async findByRefreshToken(token: string): Promise<IUser | null> {
    return await this.model.findOne({ refreshToken: token }).exec();
  }

  async findByEmailOrUsernameForReset(identifier: string): Promise<IUser | null> {
    const trimmed = (identifier || '').trim();
    const regex = new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

    return await this.model.findOne({
      $or: [
        { email: trimmed.toLowerCase() },
        { email: regex },
        { username: trimmed },
        { username: regex }
      ]
    }).select('+password +resetPasswordOtp +resetPasswordExpires').exec();
  }

  async setResetOtp(userId: string, otp: string, expires: Date): Promise<void> {
    await this.model.findByIdAndUpdate(userId, {
      resetPasswordOtp: otp,
      resetPasswordExpires: expires,
    }).exec();
  }

  async clearResetOtp(userId: string): Promise<void> {
    await this.model.findByIdAndUpdate(userId, {
      $unset: { resetPasswordOtp: 1, resetPasswordExpires: 1 }
    }).exec();
  }
}
