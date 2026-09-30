import BaseRepository from './BaseRepository';
import { Player } from '../models/Player';
import { IPlayer } from '../types';
import { ClientSession } from 'mongoose';

export class PlayerRepository extends BaseRepository<IPlayer> {
  constructor() {
    super(Player);
  }

  async findByNameExact(name: string, session?: ClientSession, userId?: any): Promise<IPlayer | null> {
    const filter: any = {
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    };
    if (userId) filter.createdBy = userId;
    return await this.model.findOne(filter).session(session || null).exec();
  }
}
