import BaseRepository from './BaseRepository';
import { Match } from '../models/Match';
import { IMatch } from '../types';

export class MatchRepository extends BaseRepository<IMatch> {
  constructor() {
    super(Match);
  }
}
