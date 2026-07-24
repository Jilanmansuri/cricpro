import { MatchSession, IMatchSession } from '../models/MatchSession';
import { BaseRepository } from './BaseRepository';

export class MatchSessionRepository extends BaseRepository<IMatchSession> {
  constructor() {
    super(MatchSession);
  }
}
