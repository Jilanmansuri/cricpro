import BaseRepository from './BaseRepository';
import { User } from '../models/User';
import { IUser } from '../types';

export class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(User);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return await this.model.findOne({ email }).select('+password').exec();
  }

  async findByUsernameOrEmail(username: string, email: string): Promise<IUser | null> {
    return await this.model.findOne({
      $or: [{ username }, { email }]
    }).exec();
  }

  async updateRefreshToken(id: string, token: string | null): Promise<void> {
    await this.model.findByIdAndUpdate(id, { refreshToken: token || undefined }).exec();
  }

  async findByRefreshToken(token: string): Promise<IUser | null> {
    return await this.model.findOne({ refreshToken: token }).exec();
  }
}
