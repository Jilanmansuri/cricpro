import BaseRepository from './BaseRepository';
import { PlayerMatchStats } from '../models/PlayerMatchStats';
import { IPlayerMatchStats } from '../types';

export class PlayerMatchStatsRepository extends BaseRepository<IPlayerMatchStats> {
  constructor() {
    super(PlayerMatchStats);
  }
}
