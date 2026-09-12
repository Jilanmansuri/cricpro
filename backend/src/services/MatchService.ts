import { Types } from 'mongoose';
import { MatchRepository } from '../repositories/MatchRepository';
import { PlayerMatchStatsRepository } from '../repositories/PlayerMatchStatsRepository';
import { TeamRepository } from '../repositories/TeamRepository';
import { VenueRepository } from '../repositories/VenueRepository';
import { PlayerMatchingService } from './PlayerMatchingService';
import { TeamMatchingService } from './TeamMatchingService';
import { StatsService } from './StatsService';
import { IMatch } from '../types';

interface BattingItem {
  name: string;
  runs: number | string;
  balls: number | string;
  fours?: number | string;
  sixes?: number | string;
  outStatus?: string;
  dismissalStatus?: string;
  dismissalText?: string;
  dismissalType?: string;
  bowler?: string | null;
  fielder?: string | null;
}

interface BowlingItem {
  name: string;
  overs: number | string;
  maidens?: number | string;
  runs?: number | string;
  runsConceded?: number | string;
  wickets?: number | string;
  wides?: number | string;
  noBalls?: number | string;
}

interface ExtrasItem {
  wides?: number;
  noBalls?: number;
  byes?: number;
  legByes?: number;
  penalty?: number;
  total?: number;
}

export class MatchService {
  private matchRepository: MatchRepository;
  private playerMatchStatsRepository: PlayerMatchStatsRepository;
  private teamRepository: TeamRepository;
  private venueRepository: VenueRepository;
  private playerMatchingService: PlayerMatchingService;
  private teamMatchingService: TeamMatchingService;
  private statsService: StatsService;

  constructor() {
    this.matchRepository = new MatchRepository();
    this.playerMatchStatsRepository = new PlayerMatchStatsRepository();
    this.teamRepository = new TeamRepository();
    this.venueRepository = new VenueRepository();
    this.playerMatchingService = new PlayerMatchingService();
    this.teamMatchingService = new TeamMatchingService();
    this.statsService = new StatsService();
  }

  private addOvers(o1: number, o2: number): number {
    const balls1 = Math.floor(o1) * 6 + Math.round((o1 % 1) * 10);
    const balls2 = Math.floor(o2) * 6 + Math.round((o2 % 1) * 10);
    const totalBalls = balls1 + balls2;
    return Math.floor(totalBalls / 6) + (totalBalls % 6) / 10;
  }

  /**
   * Determine if a team represents India (or an Indian franchise like IPL)
   * to strictly prevent foreign/opponent players from being added to stats.
   */
  private isIndianOrEligibleTeam(teamDoc: any): boolean {
    if (!teamDoc) return false;
    const teamId = (teamDoc.teamId || '').toUpperCase();
    const name = (teamDoc.name || '').toLowerCase();
    const shortName = (teamDoc.shortName || '').toLowerCase();

    // 1. Team India
    if (teamId === 'INT_IND' || name.includes('india') || shortName === 'ind') {
      return true;
    }

    // 2. IPL Franchise teams (CSK, MI, RCB, KKR, DC, GT, RR, SRH, LSG, PBKS)
    if (teamId.startsWith('IPL_') || teamDoc.league?.toLowerCase() === 'ipl') {
      return true;
    }

    // 3. Exclude foreign international teams
    const foreignInternationalCodes = [
      'INT_AUS', 'INT_ENG', 'INT_RSA', 'INT_NZL', 'INT_PAK', 
      'INT_SRI', 'INT_WI', 'INT_AFG', 'INT_BAN', 'INT_ZIM', 'INT_IRE'
    ];
    if (foreignInternationalCodes.includes(teamId)) {
      return false;
    }

    const foreignCountryNames = [
      'australia', 'england', 'south africa', 'new zealand', 'pakistan',
      'sri lanka', 'west indies', 'afghanistan', 'bangladesh', 'zimbabwe',
      'ireland', 'oman', 'hong kong', 'hongkong', 'scotland', 'netherlands',
      'nepal', 'namibia', 'usa', 'canada', 'uae'
    ];
    if (foreignCountryNames.some(c => name.includes(c))) {
      return false;
    }

    // Default to false for unknown non-Indian teams
    return false;
  }

  public async checkDuplicateMatch(payload: {
    date?: string;
    teamAName: string;
    teamBName: string;
  }): Promise<{ isDuplicate: boolean; match: IMatch | null }> {
    const { date, teamAName, teamBName } = payload;
    const teamA = await this.teamMatchingService.findMatchingTeam(teamAName);
    const teamB = await this.teamMatchingService.findMatchingTeam(teamBName);

    if (!teamA || !teamB) {
      return { isDuplicate: false, match: null };
    }

    const query: any = {
      $or: [
        { teamA: teamA._id, teamB: teamB._id },
        { teamA: teamB._id, teamB: teamA._id }
      ]
    };

    if (date) {
      const matchDate = new Date(date);
      if (!isNaN(matchDate.getTime())) {
        const startOfDay = new Date(matchDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(matchDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.date = { $gte: startOfDay, $lte: endOfDay };
      }
    }

    const duplicate = await this.matchRepository.findOne(query, ['teamA', 'teamB', 'venueId']);

    return {
      isDuplicate: !!duplicate,
      match: duplicate
    };
  }

  /**
   * Parse fielder and dismissal info from dismissal text or dismissal type
   */
  private extractFieldingContribution(batItem: BattingItem): {
    fielderName: string | null;
    isCatch: boolean;
    isStumping: boolean;
    isRunOut: boolean;
  } {
    const text = (batItem.dismissalText || batItem.outStatus || '').trim();
    const type = (batItem.dismissalType || '').toLowerCase();
    let fielderName = batItem.fielder ? batItem.fielder.trim() : null;
    let isCatch = false;
    let isStumping = false;
    let isRunOut = false;

    if (type === 'caught' || type === 'catch') {
      isCatch = true;
    } else if (type === 'stumped' || type === 'stumping') {
      isStumping = true;
    } else if (type === 'run_out' || type === 'run out') {
      isRunOut = true;
    }

    // Parse dismissalText patterns
    const catchRegex = /\bc\s+([^b]+?)\s+b\s+/i;
    const caughtAndBowledRegex = /\bc\s*&\s*b\s+(.+)/i;
    const stumpedRegex = /\bst\s+([^b]+?)\s+b\s+/i;
    const runOutRegex = /\brun\s+out\s*\(([^)]+)\)/i;

    if (catchRegex.test(text)) {
      isCatch = true;
      if (!fielderName) {
        const match = text.match(catchRegex);
        if (match && match[1]) fielderName = match[1].trim();
      }
    } else if (caughtAndBowledRegex.test(text)) {
      isCatch = true;
      if (!fielderName && batItem.bowler) {
        fielderName = batItem.bowler.trim();
      }
    } else if (stumpedRegex.test(text)) {
      isStumping = true;
      if (!fielderName) {
        const match = text.match(stumpedRegex);
        if (match && match[1]) fielderName = match[1].trim();
      }
    } else if (runOutRegex.test(text)) {
      isRunOut = true;
      if (!fielderName) {
        const match = text.match(runOutRegex);
        if (match && match[1]) fielderName = match[1].trim();
      }
    }

    return { fielderName, isCatch, isStumping, isRunOut };
  }

  public async saveMatch(payload: any): Promise<IMatch> {
    try {
      const matchInfo = payload.matchInfo || payload.match || {};
      const {
        date,
        teamName,
        teamA: rawTeamA,
        opponentTeam,
        teamB: rawTeamB,
        venueName,
        venue: rawVenue,
        tournamentId,
        overs,
        result,
        mvp: rawMvp,
        ocrConfidence
      } = matchInfo;

      // 1. Resolve Venue
      const targetVenueName = (venueName || rawVenue || '').trim();
      let venue = null;
      if (targetVenueName) {
        venue = await this.venueRepository.findByName(targetVenueName);
        if (!venue) {
          venue = await this.venueRepository.create({ name: targetVenueName });
        }
      }

      // 2. Resolve Teams using Team Master Database
      const team1Id = matchInfo.teamAId || matchInfo.team1Id || payload.teamAId || payload.team1Id;
      const team2Id = matchInfo.teamBId || matchInfo.team2Id || payload.teamBId || payload.team2Id;

      let teamA: any = null;
      let teamB: any = null;

      // Try finding by explicit ObjectId or permanent teamId
      if (team1Id) {
        if (Types.ObjectId.isValid(team1Id)) {
          teamA = await this.teamRepository.findById(team1Id);
        }
        if (!teamA) {
          teamA = await this.teamRepository.findByTeamId(team1Id);
        }
      }

      if (team2Id) {
        if (Types.ObjectId.isValid(team2Id)) {
          teamB = await this.teamRepository.findById(team2Id);
        }
        if (!teamB) {
          teamB = await this.teamRepository.findByTeamId(team2Id);
        }
      }

      const finalTeamAName = (teamName || rawTeamA || 'Team 1').trim();
      const finalTeamBName = (opponentTeam || rawTeamB || 'Team 2').trim();

      if (!teamA) {
        teamA = await this.teamMatchingService.findOrCreateTeam(finalTeamAName);
      }

      if (!teamB) {
        teamB = await this.teamMatchingService.findOrCreateTeam(finalTeamBName);
      }

      // 3. Normalize Innings & Scorecard Data
      let teamABatters: BattingItem[] = [];
      let teamBBowlers: BowlingItem[] = [];
      let teamBWaitersExtras: ExtrasItem = payload.extrasA || {};

      let teamBBatters: BattingItem[] = [];
      let teamABowlers: BowlingItem[] = [];
      let teamAWaitersExtras: ExtrasItem = payload.extrasB || {};

      if (Array.isArray(payload.innings) && payload.innings.length > 0) {
        // Innings 1: Team A bats, Team B bowls
        const inn1 = payload.innings[0];
        teamABatters = inn1.batters || [];
        teamBBowlers = inn1.bowlers || [];
        teamBWaitersExtras = inn1.extras || {};

        // Innings 2: Team B bats, Team A bowls (if available)
        if (payload.innings.length > 1) {
          const inn2 = payload.innings[1];
          teamBBatters = inn2.batters || [];
          teamABowlers = inn2.bowlers || [];
          teamAWaitersExtras = inn2.extras || {};
        }
      } else {
        // Team-keyed scorecard
        teamABatters = payload.teamABatting || payload.myTeamBatting || [];
        teamBBowlers = payload.teamBBowling || payload.myTeamBowling || [];
        teamBBatters = payload.teamBBatting || [];
        teamABowlers = payload.teamABowling || [];
      }

      // Calculate Extras Totals
      const getExtrasTotal = (ext: ExtrasItem): number => {
        if (typeof ext.total === 'number') return ext.total;
        return (
          (Number(ext.wides) || 0) +
          (Number(ext.noBalls) || 0) +
          (Number(ext.byes) || 0) +
          (Number(ext.legByes) || 0) +
          (Number(ext.penalty) || 0)
        );
      };

      const extrasTotalA = getExtrasTotal(teamBWaitersExtras);
      const extrasTotalB = getExtrasTotal(teamAWaitersExtras);

      // Calculate Team A Score
      const calcTeamARuns = teamABatters.reduce((sum, b) => sum + (Number(b.runs) || 0), 0) + extrasTotalA;
      const calcTeamAWickets = teamABatters.filter(b => {
        const st = (b.dismissalStatus || b.outStatus || '').toLowerCase();
        return st && !['not out', 'not_out', 'dnb', 'did not bat', 'retired hurt'].includes(st);
      }).length;
      const calcTeamAOvers = teamBBowlers.reduce((sum, bw) => this.addOvers(sum, Number(bw.overs) || 0), 0);

      const teamAScoreData = matchInfo.teamAScore || {};
      const finalTeamAScore = {
        runs: Number(teamAScoreData.runs) || calcTeamARuns,
        wickets: Number(teamAScoreData.wickets) ?? calcTeamAWickets,
        overs: Number(teamAScoreData.overs) || calcTeamAOvers
      };

      // Calculate Team B Score
      const calcTeamBRuns = teamBBatters.reduce((sum, b) => sum + (Number(b.runs) || 0), 0) + extrasTotalB;
      const calcTeamBWickets = teamBBatters.filter(b => {
        const st = (b.dismissalStatus || b.outStatus || '').toLowerCase();
        return st && !['not out', 'not_out', 'dnb', 'did not bat', 'retired hurt'].includes(st);
      }).length;
      const calcTeamBOvers = teamABowlers.reduce((sum, bw) => this.addOvers(sum, Number(bw.overs) || 0), 0);

      const teamBScoreData = matchInfo.teamBScore || {};
      const finalTeamBScore = {
        runs: Number(teamBScoreData.runs) || calcTeamBRuns,
        wickets: Number(teamBScoreData.wickets) ?? calcTeamBWickets,
        overs: Number(teamBScoreData.overs) || calcTeamBOvers
      };

      // 4. Resolve MVP player if present (only associate if it matches an existing player, do not create non-Indian players)
      let mvpPlayerId: Types.ObjectId | undefined = undefined;
      if (rawMvp && typeof rawMvp === 'string' && rawMvp.trim()) {
        const matchedMvp = await this.playerMatchingService.findMatchingPlayer(rawMvp.trim());
        if (matchedMvp) {
          mvpPlayerId = matchedMvp._id as Types.ObjectId;
        }
      }

      // 5. Check if duplicate match exists
      const duplicateCheck = await this.checkDuplicateMatch({
        date,
        teamAName: teamA.name,
        teamBName: teamB.name
      });

      let match: any;
      if (duplicateCheck.isDuplicate && duplicateCheck.match && !payload.forceNew) {
        // Update existing match record instead of duplicating
        match = duplicateCheck.match;
        match.teamAScore = finalTeamAScore;
        match.teamBScore = finalTeamBScore;
        match.overs = Number(overs) || match.overs || 20;
        if (result) match.result = result;
        if (venue) match.venueId = venue._id;
        if (mvpPlayerId) match.mvp = mvpPlayerId;
        if (ocrConfidence) match.ocrConfidence = Number(ocrConfidence);
        await match.save();

        // Delete old playerMatchStats for this match before re-inserting
        await this.playerMatchStatsRepository.deleteMany({ matchId: match._id });
      } else {
        // Create new Match record
        match = await this.matchRepository.create({
          tournamentId: tournamentId ? new Types.ObjectId(tournamentId) : undefined,
          venueId: venue ? venue._id : undefined,
          date: date ? new Date(date) : new Date(),
          overs: Number(overs) || 20,
          teamA: teamA._id,
          teamB: teamB._id,
          teamAScore: finalTeamAScore,
          teamBScore: finalTeamBScore,
          result: result || undefined,
          mvp: mvpPlayerId,
          scorecardUrl: payload.scorecardUrl || undefined,
          ocrConfidence: Number(ocrConfidence) || 1.0
        });
      }

      const affectedPlayerIds: Types.ObjectId[] = [];

      // Collect fielding stats from dismissals
      // Team A dismissals -> Team B fielders
      const teamBFieldingEvents: { [name: string]: { catches: number; stumpings: number; runOuts: number } } = {};
      teamABatters.forEach(b => {
        const f = this.extractFieldingContribution(b);
        if (f.fielderName) {
          const key = f.fielderName.toLowerCase();
          teamBFieldingEvents[key] = teamBFieldingEvents[key] || { catches: 0, stumpings: 0, runOuts: 0 };
          if (f.isCatch) teamBFieldingEvents[key].catches++;
          if (f.isStumping) teamBFieldingEvents[key].stumpings++;
          if (f.isRunOut) teamBFieldingEvents[key].runOuts++;
        }
      });

      // Team B dismissals -> Team A fielders
      const teamAFieldingEvents: { [name: string]: { catches: number; stumpings: number; runOuts: number } } = {};
      teamBBatters.forEach(b => {
        const f = this.extractFieldingContribution(b);
        if (f.fielderName) {
          const key = f.fielderName.toLowerCase();
          teamAFieldingEvents[key] = teamAFieldingEvents[key] || { catches: 0, stumpings: 0, runOuts: 0 };
          if (f.isCatch) teamAFieldingEvents[key].catches++;
          if (f.isStumping) teamAFieldingEvents[key].stumpings++;
          if (f.isRunOut) teamAFieldingEvents[key].runOuts++;
        }
      });

      // Helper to process a team's players into consolidated PlayerMatchStats
      const processTeamPlayers = async (
        teamDoc: any,
        batters: BattingItem[],
        bowlers: BowlingItem[],
        fieldingMap: { [name: string]: { catches: number; stumpings: number; runOuts: number } }
      ) => {
        // STRICT GUARD: Only track players for Team India (and Indian franchise leagues like IPL).
        // Non-Indian / opponent teams (Australia, Pakistan, England, etc.) must NEVER create players or stats!
        if (!this.isIndianOrEligibleTeam(teamDoc)) {
          console.log(`[MatchService] Skipping player creation and stats calculation for opponent/non-Indian team: ${teamDoc?.name || 'Unknown'}`);
          return;
        }

        const playerStatsMap = new Map<string, {
          name: string;
          batting: any;
          bowling: any;
          fielding: any;
        }>();

        // 1. Batting
        for (const bat of batters) {
          if (!bat.name || !bat.name.trim()) continue;
          const key = bat.name.trim().toLowerCase();
          const outStatus = (bat.dismissalStatus || bat.outStatus || 'out').trim();
          const isDnb = ['dnb', 'did not bat'].includes(outStatus.toLowerCase());

          playerStatsMap.set(key, {
            name: bat.name.trim(),
            batting: {
              didNotBat: isDnb,
              runs: Number(bat.runs) || 0,
              balls: Number(bat.balls) || 0,
              fours: Number(bat.fours) || 0,
              sixes: Number(bat.sixes) || 0,
              outStatus: isDnb ? 'DNB' : outStatus
            },
            bowling: {
              didNotBowl: true,
              overs: 0,
              maidens: 0,
              runsConceded: 0,
              wickets: 0
            },
            fielding: { catches: 0, stumpings: 0, runOuts: 0 }
          });
        }

        // 2. Bowling
        for (const bowl of bowlers) {
          if (!bowl.name || !bowl.name.trim()) continue;
          const key = bowl.name.trim().toLowerCase();
          const existing = playerStatsMap.get(key) || {
            name: bowl.name.trim(),
            batting: { didNotBat: true, runs: 0, balls: 0, fours: 0, sixes: 0, outStatus: 'DNB' },
            bowling: { didNotBowl: true, overs: 0, maidens: 0, runsConceded: 0, wickets: 0 },
            fielding: { catches: 0, stumpings: 0, runOuts: 0 }
          };

          existing.bowling = {
            didNotBowl: false,
            overs: Number(bowl.overs) || 0,
            maidens: Number(bowl.maidens) || 0,
            runsConceded: Number(bowl.runsConceded ?? bowl.runs) || 0,
            wickets: Number(bowl.wickets) || 0
          };

          playerStatsMap.set(key, existing);
        }

        // 3. Fielding
        for (const [fielderKey, fStats] of Object.entries(fieldingMap)) {
          const existing = playerStatsMap.get(fielderKey);
          if (existing) {
            existing.fielding.catches += fStats.catches;
            existing.fielding.stumpings += fStats.stumpings;
            existing.fielding.runOuts += fStats.runOuts;
          } else {
            // Fielder did not bat or bowl in this innings
            playerStatsMap.set(fielderKey, {
              name: fielderKey,
              batting: { didNotBat: true, runs: 0, balls: 0, fours: 0, sixes: 0, outStatus: 'DNB' },
              bowling: { didNotBowl: true, overs: 0, maidens: 0, runsConceded: 0, wickets: 0 },
              fielding: { catches: fStats.catches, stumpings: fStats.stumpings, runOuts: fStats.runOuts }
            });
          }
        }

        // Save each player to DB and create PlayerMatchStats
        for (const entry of playerStatsMap.values()) {
          const player = await this.playerMatchingService.findOrCreatePlayer(entry.name, {
            country: 'India',
            nationalTeamId: 'INT_IND'
          });
          affectedPlayerIds.push(player._id as Types.ObjectId);

          if (!teamDoc.players.some((id: any) => id.toString() === player._id.toString())) {
            teamDoc.players.push(player._id as Types.ObjectId);
          }

          await this.playerMatchStatsRepository.create({
            matchId: match._id,
            playerId: player._id,
            playerName: player.name,
            teamId: teamDoc._id,
            batting: entry.batting,
            bowling: entry.bowling,
            fielding: entry.fielding
          });
        }
      };

      // Process Team A Players (Batters from teamABatters, Bowlers from teamABowlers, Fielders from teamAFieldingEvents)
      await processTeamPlayers(teamA, teamABatters, teamABowlers, teamAFieldingEvents);

      // Process Team B Players (Batters from teamBBatters, Bowlers from teamBBowlers, Fielders from teamBFieldingEvents)
      await processTeamPlayers(teamB, teamBBatters, teamBBowlers, teamBFieldingEvents);

      await teamA.save();
      await teamB.save();

      // Recalculate Career Statistics for all unique affected players
      const uniquePlayers = Array.from(new Set(affectedPlayerIds.map(id => id.toString()))).map(id => new Types.ObjectId(id));
      for (const pId of uniquePlayers) {
        await this.statsService.recalculatePlayerCareer(pId);
      }

      // Recalculate Team Statistics for both teams
      await this.statsService.recalculateTeamStats(teamA._id as Types.ObjectId);
      await this.statsService.recalculateTeamStats(teamB._id as Types.ObjectId);

      // Recalculate Tournament Points Table if match is part of a tournament
      if (tournamentId) {
        await this.statsService.recalculateTournamentPointsTable(new Types.ObjectId(tournamentId));
      }

      return match;
    } catch (error) {
      console.error('MatchService saveMatch error:', error);
      throw error;
    }
  }
}

export default MatchService;
