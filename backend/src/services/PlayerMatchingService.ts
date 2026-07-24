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

  private getSoundexCode(name: string): string {
    const s = name.toUpperCase().replace(/[^A-Z]/g, '');
    if (s.length === 0) return '';

    const firstLetter = s[0];
    const mappings: { [key: string]: string } = {
      B: '1', F: '1', P: '1', V: '1',
      C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
      D: '3', T: '3',
      L: '4',
      M: '5', N: '5',
      R: '6'
    };

    let code = firstLetter;
    let prevCode = mappings[firstLetter] || '';

    for (let i = 1; i < s.length; i++) {
      const char = s[i];
      if (['A', 'E', 'I', 'O', 'U', 'H', 'W', 'Y'].includes(char)) {
        prevCode = '';
        continue;
      }
      const nextCode = mappings[char] || '';
      if (nextCode !== '' && nextCode !== prevCode) {
        code += nextCode;
        prevCode = nextCode;
      }
    }

    return (code + '0000').slice(0, 4);
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
    }

    // 3. Search database for abbreviation match, fuzzy match, or phonetic Soundex match
    const allPlayers = await this.playerRepository.find({}, { session });
    const inputSoundex = this.getSoundexCode(name);

    for (const player of allPlayers) {
      const playerName = player.name;

      if (this.isAbbreviationMatch(name, playerName) || this.isAbbreviationMatch(playerName, name)) {
        // Link alias
        await this.aliasRepository.create({ playerId: player._id, alias: lowerName }, session).catch(() => {});
        return player;
      }

      if (this.getSimilarity(name, playerName) > 0.85) {
        // Link alias
        await this.aliasRepository.create({ playerId: player._id, alias: lowerName }, session).catch(() => {});
        return player;
      }

      // Phonetic matching using Soundex
      if (inputSoundex && inputSoundex === this.getSoundexCode(playerName)) {
        // Link alias
        await this.aliasRepository.create({ playerId: player._id, alias: lowerName }, session).catch(() => {});
        return player;
      }

      for (const playerAlias of player.aliases) {
        if (this.getSimilarity(name, playerAlias) > 0.85 || (inputSoundex && inputSoundex === this.getSoundexCode(playerAlias))) {
          return player;
        }
      }
    }

    return null;
  }

  public async findOrCreatePlayer(name: string, session?: mongoose.ClientSession): Promise<IPlayer> {
    let player = await this.findMatchingPlayer(name, session);
    if (!player) {
      player = await this.playerRepository.create({
        name,
        aliases: [name],
      }, session);

      await this.aliasRepository.create({
        playerId: player._id,
        alias: name.toLowerCase(),
      }, session).catch(() => {});
    }
    return player;
  }
}
