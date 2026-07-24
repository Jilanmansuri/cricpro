import BaseRepository from './BaseRepository';
import { PlayerAlias } from '../models/PlayerAlias';
import { IPlayerAlias } from '../types';

export class PlayerAliasRepository extends BaseRepository<IPlayerAlias> {
  constructor() {
    super(PlayerAlias);
  }
}
