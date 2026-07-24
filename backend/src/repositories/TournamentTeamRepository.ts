import BaseRepository from './BaseRepository';
import { TournamentTeam } from '../models/TournamentTeam';
import { ITournamentTeam } from '../types';

export class TournamentTeamRepository extends BaseRepository<ITournamentTeam> {
  constructor() {
    super(TournamentTeam);
  }
}
