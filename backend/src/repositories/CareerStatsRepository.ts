import BaseRepository from './BaseRepository';
import { CareerStats } from '../models/CareerStats';
import { ICareerStats } from '../types';

export class CareerStatsRepository extends BaseRepository<ICareerStats> {
  constructor() {
    super(CareerStats);
  }
}
