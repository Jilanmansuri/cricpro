import BaseRepository from './BaseRepository';
import { Team } from '../models/Team';
import { ITeam } from '../types';
import { ClientSession } from 'mongoose';

export class TeamRepository extends BaseRepository<ITeam> {
  constructor() {
    super(Team);
  }

  async findByName(name: string, session?: ClientSession): Promise<ITeam | null> {
    return await this.model.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    }).session(session || null).exec();
  }
}
