import BaseRepository from './BaseRepository';
import { Tournament } from '../models/Tournament';
import { ITournament } from '../types';

export class TournamentRepository extends BaseRepository<ITournament> {
  constructor() {
    super(Tournament);
  }
}
