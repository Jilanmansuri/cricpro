import { TeamRepository } from '../repositories/TeamRepository';
import { ITeam } from '../types';
import mongoose from 'mongoose';

export interface TeamCandidate {
  team: ITeam;
  confidence: number;
  matchReason: string;
}

export interface TeamResolutionResult {
  resolved: boolean;
  confidence: number;
  needsReview: boolean;
  team: ITeam | null;
  candidates: TeamCandidate[];
}

const COMMON_TEAM_ALIASES: Record<string, string[]> = {
  'india': ['ind', 'team india', 'india cricket team', 'bharat', 'men in blue'],
  'australia': ['aus', 'aussie', 'australia cricket team', 'baggy greens'],
  'england': ['eng', 'england cricket team', 'three lions'],
  'pakistan': ['pak', 'pakistan cricket team', 'shaheens', 'men in green'],
  'south africa': ['sa', 'rsa', 'proteas'],
  'new zealand': ['nz', 'blackcaps', 'kiwis'],
  'west indies': ['wi', 'win', 'windies'],
  'sri lanka': ['sl', 'srilanka', 'lions'],
  'bangladesh': ['ban', 'tigers'],
  'afghanistan': ['afg', 'afghan'],
  'chennai super kings': ['csk', 'super kings', 'whistle podu'],
  'mumbai indians': ['mi', 'mumbai'],
  'royal challengers bangalore': ['rcb', 'royal challengers bengaluru', 'bengaluru'],
  'kolkata knight riders': ['kkr', 'kolkata'],
  'delhi capitals': ['dc', 'delhi daredevils', 'delhi'],
  'sunrisers hyderabad': ['srh', 'hyderabad'],
  'rajasthan royals': ['rr', 'rajasthan'],
  'punjab kings': ['pbks', 'kxip', 'kings xi punjab', 'punjab'],
  'gujarat titans': ['gt', 'titans'],
  'lucknow super giants': ['lsg', 'super giants']
};

export class TeamMatchingService {
  private teamRepository: TeamRepository;

  constructor() {
    this.teamRepository = new TeamRepository();
  }

  public normalizeString(input: string): string {
    if (!input) return '';
    let str = input.toLowerCase().trim();
    // Replace punctuation with spaces
    str = str.replace(/[.\-_'"()[\]{}:,]/g, ' ');
    // Remove extra spaces
    return str.replace(/\s+/g, ' ').trim();
  }

  public normalizeOcrErrors(input: string): string {
    if (!input) return '';
    return input
      .replace(/\b1(?=[a-z])/gi, 'i')
      .replace(/(?<=[a-z])0(?=[a-z])/gi, 'o')
      .replace(/\b0(?=[a-z])/gi, 'o')
      .replace(/\|/g, 'i')
      .trim();
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
    const clean1 = this.normalizeString(s1);
    const clean2 = this.normalizeString(s2);
    if (!clean1 || !clean2) return 0;
    if (clean1 === clean2) return 1.0;

    const distance = this.getLevenshteinDistance(clean1, clean2);
    const maxLength = Math.max(clean1.length, clean2.length);
    if (maxLength === 0) return 1.0;
    return 1.0 - distance / maxLength;
  }

  private getInitials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .map(part => part[0])
      .join('')
      .toLowerCase();
  }

  /**
   * Search Team Master database and resolve raw team string
   */
  public async resolveTeamMaster(
    rawName: string,
    context?: { league?: string; competition?: string },
    session?: mongoose.ClientSession
  ): Promise<TeamResolutionResult> {
    if (!rawName || !rawName.trim()) {
      return {
        resolved: false,
        confidence: 0,
        needsReview: true,
        team: null,
        candidates: []
      };
    }

    const rawTrimmed = rawName.trim();
    const normalizedInput = this.normalizeString(rawTrimmed);
    const ocrCorrectedInput = this.normalizeString(this.normalizeOcrErrors(rawTrimmed));

    // 1. Exact direct matches in Database
    // 1a. teamId match
    const byTeamId = await this.teamRepository.findByTeamId(rawTrimmed, session);
    if (byTeamId) {
      return {
        resolved: true,
        confidence: 1.0,
        needsReview: false,
        team: byTeamId,
        candidates: [{ team: byTeamId, confidence: 1.0, matchReason: 'Exact teamId match' }]
      };
    }

    // 1b. Abbreviation match
    const byAbbr = await this.teamRepository.findByAbbreviation(rawTrimmed, session);
    if (byAbbr) {
      return {
        resolved: true,
        confidence: 1.0,
        needsReview: false,
        team: byAbbr,
        candidates: [{ team: byAbbr, confidence: 1.0, matchReason: 'Exact abbreviation match' }]
      };
    }

    // 1c. Name or Official Name or Display Name match
    const byName = await this.teamRepository.findByName(rawTrimmed, session);
    if (byName) {
      return {
        resolved: true,
        confidence: 1.0,
        needsReview: false,
        team: byName,
        candidates: [{ team: byName, confidence: 1.0, matchReason: 'Exact name match' }]
      };
    }

    // 1d. Alias array match in DB
    const byAlias = await this.teamRepository.findByAlias(normalizedInput, session);
    if (byAlias) {
      return {
        resolved: true,
        confidence: 0.98,
        needsReview: false,
        team: byAlias,
        candidates: [{ team: byAlias, confidence: 0.98, matchReason: 'Direct alias match' }]
      };
    }

    // 2. Scan all existing teams from Team Master for deep matching
    const allTeams = await this.teamRepository.find({}, { session });
    const candidatesMap = new Map<string, TeamCandidate>();

    const addCandidate = (team: ITeam, score: number, reason: string) => {
      let finalScore = score;
      // Contextual league boost
      if (context?.league && team.league && team.league.toLowerCase() === context.league.toLowerCase()) {
        finalScore = Math.min(1.0, finalScore + 0.05);
      }
      const existing = candidatesMap.get(team._id.toString());
      if (!existing || existing.confidence < finalScore) {
        candidatesMap.set(team._id.toString(), {
          team,
          confidence: Math.round(finalScore * 100) / 100,
          matchReason: reason
        });
      }
    };

    for (const team of allTeams) {
      const tOfficial = this.normalizeString(team.officialName || '');
      const tDisplay = this.normalizeString(team.displayName || team.name || '');
      const tShort = this.normalizeString(team.shortName || '');
      const tAbbr = (team.abbreviation || '').toLowerCase().trim();
      const tAliases = (team.aliases || []).map(a => this.normalizeString(a));

      // Normalized name match
      if (normalizedInput === tOfficial || normalizedInput === tDisplay || normalizedInput === tShort) {
        addCandidate(team, 0.98, 'Normalized name match');
        continue;
      }

      // Abbreviation match
      if (normalizedInput === tAbbr || ocrCorrectedInput === tAbbr) {
        addCandidate(team, 0.96, 'Abbreviation match');
        continue;
      }

      // Initials acronym check
      const displayInitials = this.getInitials(tDisplay);
      const officialInitials = this.getInitials(tOfficial);
      if (normalizedInput === displayInitials || normalizedInput === officialInitials) {
        addCandidate(team, 0.95, 'Acronym initials match');
        continue;
      }

      // Team Master registered aliases
      for (const al of tAliases) {
        if (normalizedInput === al || ocrCorrectedInput === al) {
          addCandidate(team, 0.95, `Registered alias match (${al})`);
          break;
        }
      }

      // Fallback common aliases dictionary check
      for (const [canonical, aliases] of Object.entries(COMMON_TEAM_ALIASES)) {
        const teamMatchesCanonical = tDisplay === canonical || tOfficial === canonical || tAliases.includes(canonical);
        const inputMatchesCanonical = normalizedInput === canonical || ocrCorrectedInput === canonical;
        const inputMatchesAlias = aliases.includes(normalizedInput) || aliases.includes(ocrCorrectedInput);
        const teamMatchesAlias = aliases.includes(tDisplay) || aliases.includes(tAbbr);

        if ((teamMatchesCanonical && inputMatchesAlias) ||
            (inputMatchesCanonical && teamMatchesAlias) ||
            (inputMatchesAlias && teamMatchesAlias)) {
          addCandidate(team, 0.94, 'Standard cricket alias match');
          break;
        }
      }

      // Fuzzy string similarity
      const simOfficial = this.getSimilarity(normalizedInput, tOfficial);
      const simDisplay = this.getSimilarity(normalizedInput, tDisplay);
      const simShort = this.getSimilarity(normalizedInput, tShort);
      const maxFuzzy = Math.max(simOfficial, simDisplay, simShort);

      if (maxFuzzy >= 0.85) {
        addCandidate(team, maxFuzzy * 0.92, `Fuzzy string similarity (${Math.round(maxFuzzy * 100)}%)`);
      } else if (maxFuzzy >= 0.70) {
        addCandidate(team, maxFuzzy * 0.80, `Partial similarity (${Math.round(maxFuzzy * 100)}%)`);
      }
    }

    const sortedCandidates = Array.from(candidatesMap.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    if (sortedCandidates.length === 0) {
      return {
        resolved: false,
        confidence: 0,
        needsReview: true,
        team: null,
        candidates: []
      };
    }

    const top = sortedCandidates[0];
    const isHighConfidence = top.confidence >= 0.85;

    return {
      resolved: isHighConfidence,
      confidence: top.confidence,
      needsReview: !isHighConfidence,
      team: top.team,
      candidates: sortedCandidates
    };
  }

  /**
   * Backwards compatible findMatchingTeam
   */
  public async findMatchingTeam(rawName: string, session?: mongoose.ClientSession): Promise<ITeam | null> {
    const result = await this.resolveTeamMaster(rawName, undefined, session);
    return result.team;
  }

  /**
   * Resolves against Team Master; if genuinely new and confirmed, creates a Master record
   */
  public async findOrCreateTeam(name: string, session?: mongoose.ClientSession): Promise<ITeam> {
    const trimmed = name.trim();
    const resolution = await this.resolveTeamMaster(trimmed, undefined, session);

    if (resolution.team && resolution.confidence >= 0.80) {
      return resolution.team;
    }

    // Fallback: Create unverified team record adhering to Team Master schema
    const slugId = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || `TEAM_${Date.now()}`;
    return await this.teamRepository.create({
      teamId: slugId,
      officialName: trimmed,
      displayName: trimmed,
      shortName: trimmed,
      abbreviation: slugId.slice(0, 4),
      aliases: [trimmed.toLowerCase()],
      name: trimmed,
      logo: '',
      logoUrl: '',
      isActive: true,
      players: [],
      stats: {
        matches: 0,
        wins: 0,
        losses: 0,
        points: 0,
        nrr: 0
      }
    }, session);
  }
}

export default TeamMatchingService;
