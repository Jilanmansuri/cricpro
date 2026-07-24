import BaseRepository from './BaseRepository';
import { Venue } from '../models/Venue';
import { IVenue } from '../types';
import { ClientSession } from 'mongoose';

export class VenueRepository extends BaseRepository<IVenue> {
  constructor() {
    super(Venue);
  }

  async findByName(name: string, session?: ClientSession): Promise<IVenue | null> {
    return await this.model.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    }).session(session || null).exec();
  }
}
