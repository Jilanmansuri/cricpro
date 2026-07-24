import BaseRepository from './BaseRepository';
import { Award } from '../models/Award';
import { IAward } from '../types';

export class AwardRepository extends BaseRepository<IAward> {
  constructor() {
    super(Award);
  }
}
