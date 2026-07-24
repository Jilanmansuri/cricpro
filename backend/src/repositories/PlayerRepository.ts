import BaseRepository from './BaseRepository';
import { Player } from '../models/Player';
import { IPlayer } from '../types';
import { ClientSession } from 'mongoose';

export class PlayerRepository extends BaseRepository<IPlayer> {
  constructor() {
    super(Player);
  }

  async findByNameExact(name: string, session?: ClientSession): Promise<IPlayer | null> {
    return await this.model.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    }).session(session || null).exec();
  }
}
