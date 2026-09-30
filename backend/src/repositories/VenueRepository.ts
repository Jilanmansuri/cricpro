import BaseRepository from './BaseRepository';
import { Venue } from '../models/Venue';
import { IVenue } from '../types';
import { ClientSession } from 'mongoose';

export class VenueRepository extends BaseRepository<IVenue> {
  constructor() {
    super(Venue);
  }

  async findByName(name: string, session?: ClientSession, userId?: any): Promise<IVenue | null> {
    const filter: any = {
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    };
    if (userId) filter.createdBy = userId;
    return await this.model.findOne(filter).session(session || null).exec();
  }
}
