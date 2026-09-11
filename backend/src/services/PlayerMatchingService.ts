import { PlayerRepository } from '../repositories/PlayerRepository';
import { PlayerAliasRepository } from '../repositories/PlayerAliasRepository';
import { IPlayer } from '../types';
import mongoose from 'mongoose';

export class PlayerMatchingService {
  private playerRepository: PlayerRepository;
  private aliasRepository: PlayerAliasRepository;

  constructor() {
    this.playerRepository = new PlayerRepository();
    this.aliasRepository = new PlayerAliasRepository();
  }

  private getLevenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
        }
      }
    }
    return dp[m][n];
  }

  private getSimilarity(s1: string, s2: string): number {
    const clean1 = s1.toLowerCase().trim();
    const clean2 = s2.toLowerCase().trim();
    if (clean1 === clean2) return 1.0;

    const distance = this.getLevenshteinDistance(clean1, clean2);
    const maxLength = Math.max(clean1.length, clean2.length);
    if (maxLength === 0) return 1.0;
    return 1.0 - distance / maxLength;
  }

  private isAbbreviationMatch(abbr: string, full: string): boolean {
    const cleanAbbr = abbr.toLowerCase().trim().replace(/\./g, '');
    const cleanFull = full.toLowerCase().trim().replace(/\./g, '');

    const abbrTokens = cleanAbbr.split(/\s+/);
    const fullTokens = cleanFull.split(/\s+/);

    // Initial abbreviation matching (e.g. VK -> Virat Kohli)
    if (abbrTokens.length === 1 && abbrTokens[0].length === 2 && fullTokens.length === 2) {
      const initials = fullTokens.map(t => t[0]).join('');
      if (abbrTokens[0] === initials) {
        return true;
      }
    }

    if (abbrTokens.length < 2 || fullTokens.length < 2) {
      return false;
    }

    const abbrLastName = abbrTokens[abbrTokens.length - 1];
    const fullLastName = fullTokens[fullTokens.length - 1];

    if (abbrLastName === fullLastName) {
      const abbrFirstChar = abbrTokens[0];
      const fullFirstToken = fullTokens[0];

      if (abbrFirstChar.length === 1 && fullFirstToken.startsWith(abbrFirstChar)) {
        return true;
      }
    }

    return false;
  }

  public async findMatchingPlayer(rawName: string, session?: mongoose.ClientSession): Promise<IPlayer | null> {
    const name = rawName.trim();
    if (!name) return null;
    const lowerName = name.toLowerCase();

    // 1. Exact case-insensitive match
    let matchedPlayer = await this.playerRepository.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    }, undefined, session);
    if (matchedPlayer) return matchedPlayer;

    // 2. Direct lookup in aliases
    const aliasEntry = await this.aliasRepository.findOne({ alias: lowerName }, undefined, session);
    if (aliasEntry) {
      matchedPlayer = await this.playerRepository.findById(aliasEntry.playerId, undefined, session);
      if (matchedPlayer) return matchedPlayer;
      // If alias points to a non-existent player, delete orphan alias so it doesn't block resolution
      await this.aliasRepository.delete(aliasEntry._id, session).catch(() => {});
    }

    // 3. Search database for strict abbreviation or very high fuzzy match (typo only)
    // NOTE: Soundex matching was removed because it falsely merged different players (e.g., S Dube and S Yadav share soundex S310)
    const allPlayers = await this.playerRepository.find({}, { session });

    for (const player of allPlayers) {
      const playerName = player.name;

      // Abbreviation match: only if last names match exactly and initial matches first token (e.g. 'V Kohli' -> 'Virat Kohli')
      if (this.isAbbreviationMatch(name, playerName) || this.isAbbreviationMatch(playerName, name)) {
        await this.aliasRepository.create({ playerId: player._id, alias: lowerName }, session).catch(() => {});
        return player;
      }

      // Very high similarity (>=0.92) with matching first letter for minor typos
      if (
        name.length > 4 &&
        playerName.length > 4 &&
        name[0].toLowerCase() === playerName[0].toLowerCase() &&
        this.getSimilarity(name, playerName) >= 0.92
      ) {
        await this.aliasRepository.create({ playerId: player._id, alias: lowerName }, session).catch(() => {});
        return player;
      }

      for (const playerAlias of player.aliases) {
        if (
          name.length > 4 &&
          playerAlias.length > 4 &&
          name[0].toLowerCase() === playerAlias[0].toLowerCase() &&
          this.getSimilarity(name, playerAlias) >= 0.92
        ) {
          return player;
        }
      }
    }

    return null;
  }

  public async findOrCreatePlayer(name: string, session?: mongoose.ClientSession): Promise<IPlayer> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Player name cannot be empty');
    }

    let player = await this.findMatchingPlayer(trimmedName, session);
    if (!player) {
      player = await this.playerRepository.create({
        name: trimmedName,
        aliases: [trimmedName],
      }, session);

      await this.aliasRepository.create({
        playerId: player._id,
        alias: trimmedName.toLowerCase(),
      }, session).catch(() => {});
    }
    return player;
  }
}
