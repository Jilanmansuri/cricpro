import { Types } from 'mongoose';
import { MatchRepository } from '../repositories/MatchRepository';
import { PlayerMatchStatsRepository } from '../repositories/PlayerMatchStatsRepository';
import { TeamRepository } from '../repositories/TeamRepository';
import { VenueRepository } from '../repositories/VenueRepository';
import { PlayerMatchingService } from './PlayerMatchingService';
import { StatsService } from './StatsService';
import { IMatch } from '../types';

export class MatchService {
  private matchRepository: MatchRepository;
  private playerMatchStatsRepository: PlayerMatchStatsRepository;
  private teamRepository: TeamRepository;
  private venueRepository: VenueRepository;
  private playerMatchingService: PlayerMatchingService;
  private statsService: StatsService;

  constructor() {
    this.matchRepository = new MatchRepository();
    this.playerMatchStatsRepository = new PlayerMatchStatsRepository();
    this.teamRepository = new TeamRepository();
    this.venueRepository = new VenueRepository();
    this.playerMatchingService = new PlayerMatchingService();
    this.statsService = new StatsService();
  }

  public async checkDuplicateMatch(payload: {
    date: string;
    teamAName: string;
    teamBName: string;
  }): Promise<{ isDuplicate: boolean; match: IMatch | null }> {
    const { date, teamAName, teamBName } = payload;
    const matchDate = new Date(date);
    const startOfDay = new Date(matchDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(matchDate.setHours(23, 59, 59, 999));

    const teamA = await this.teamRepository.findByName(teamAName);
    const teamB = await this.teamRepository.findByName(teamBName);

    if (!date || !teamA || !teamB) {
      return { isDuplicate: false, match: null };
    }

    const duplicate = await this.matchRepository.findOne(
      {
        date: { $gte: startOfDay, $lte: endOfDay },
        $or: [
          { teamA: teamA._id, teamB: teamB._id },
          { teamA: teamB._id, teamB: teamA._id }
        ]
      },
      ['teamA', 'teamB', 'venueId']
    );

    return {
      isDuplicate: !!duplicate,
      match: duplicate
    };
  }

  public async saveMatch(payload: any): Promise<IMatch> {
    try {
      const {
        matchInfo,
        myTeamBatting,
        myTeamBowling
      } = payload;

      const {
        date,
        teamName,
        opponentTeam,
        venueName,
        tournamentId,
        overs,
        result
      } = matchInfo;

      // 1. Resolve Venue
      let venue = null;
      if (venueName) {
        venue = await this.venueRepository.findByName(venueName);
        if (!venue) {
          venue = await this.venueRepository.create({ name: venueName });
        }
      }

      // 2. Resolve Teams
      const finalTeamAName = teamName || `My Team (${Date.now()})`;
      const finalTeamBName = opponentTeam || `Opponent (${Date.now()})`;

      let teamA = await this.teamRepository.findByName(finalTeamAName);
      if (!teamA) {
        teamA = await this.teamRepository.create({ name: finalTeamAName });
      }

      let teamB = await this.teamRepository.findByName(finalTeamBName);
      if (!teamB) {
        teamB = await this.teamRepository.create({ name: finalTeamBName });
      }

      // Calculate Team A Score from batting array
      const teamARuns = myTeamBatting.reduce((sum: number, bat: any) => sum + (Number(bat.runs) || 0), 0);
      const teamAWickets = myTeamBatting.filter((bat: any) => bat.outStatus && bat.outStatus.toLowerCase() !== 'not out' && bat.outStatus.toLowerCase() !== 'dnb').length;
      
      const addOvers = (o1: number, o2: number) => {
        const balls1 = Math.floor(o1) * 6 + Math.round((o1 % 1) * 10);
        const balls2 = Math.floor(o2) * 6 + Math.round((o2 % 1) * 10);
        const totalBalls = balls1 + balls2;
        return Math.floor(totalBalls / 6) + (totalBalls % 6) / 10;
      };

      const teamAOvers = myTeamBatting.reduce((sum: number, bat: any) => addOvers(sum, Number(bat.balls) ? Math.floor(Number(bat.balls)/6) + (Number(bat.balls)%6)/10 : 0), 0);

      // Create Match
      const match = await this.matchRepository.create({
        tournamentId: tournamentId ? new Types.ObjectId(tournamentId) : undefined,
        venueId: venue ? venue._id : undefined,
        date: date ? new Date(date) : new Date(),
        overs: Number(overs) || 20,
        teamA: teamA._id,
        teamB: teamB._id,
        teamAScore: { runs: teamARuns, wickets: teamAWickets, overs: teamAOvers },
        teamBScore: { runs: 0, wickets: 0, overs: 0 },
        result: result || undefined,
        scorecardUrl: undefined,
        ocrConfidence: 1.0
      });

      const affectedPlayerIds: Types.ObjectId[] = [];

      // Process My Team (Team A)
      for (const bat of myTeamBatting) {
        if (!bat.name) continue;
        
        const player = await this.playerMatchingService.findOrCreatePlayer(bat.name);
        affectedPlayerIds.push(player._id as Types.ObjectId);

        if (!teamA.players.includes(player._id as Types.ObjectId)) {
          teamA.players.push(player._id as Types.ObjectId);
        }

        const bowl = myTeamBowling.find((b: any) => b.name.toLowerCase() === bat.name.toLowerCase());

        const statsData = {
          matchId: match._id,
          playerId: player._id,
          teamId: teamA._id,
          batting: {
            didNotBat: bat.outStatus === 'DNB',
            runs: Number(bat.runs) || 0,
            balls: Number(bat.balls) || 0,
            fours: Number(bat.fours) || 0,
            sixes: Number(bat.sixes) || 0,
            outStatus: bat.outStatus || 'out'
          },
          bowling: bowl ? {
            didNotBowl: false,
            overs: Number(bowl.overs) || 0,
            maidens: Number(bowl.maidens) || 0,
            runsConceded: Number(bowl.runs) || 0,
            wickets: Number(bowl.wickets) || 0
          } : {
            didNotBowl: true,
            overs: 0,
            maidens: 0,
            runsConceded: 0,
            wickets: 0
          },
          fielding: { catches: 0, stumpings: 0, runOuts: 0 }
        };

        await this.playerMatchStatsRepository.create(statsData);
      }

      // Process bowlers who didn't bat
      for (const bowl of myTeamBowling) {
        if (!bowl.name) continue;
        
        const batMatch = myTeamBatting.find((b: any) => b.name.toLowerCase() === bowl.name.toLowerCase());
        if (!batMatch) {
          const player = await this.playerMatchingService.findOrCreatePlayer(bowl.name);
          affectedPlayerIds.push(player._id as Types.ObjectId);

          if (!teamA.players.includes(player._id as Types.ObjectId)) {
            teamA.players.push(player._id as Types.ObjectId);
          }

          const statsData = {
            matchId: match._id,
            playerId: player._id,
            teamId: teamA._id,
            batting: {
              didNotBat: true,
              runs: 0, balls: 0, fours: 0, sixes: 0, outStatus: 'DNB'
            },
            bowling: {
              didNotBowl: false,
              overs: Number(bowl.overs) || 0,
              maidens: Number(bowl.maidens) || 0,
              runsConceded: Number(bowl.runs) || 0,
              wickets: Number(bowl.wickets) || 0
            },
            fielding: { catches: 0, stumpings: 0, runOuts: 0 }
          };

          await this.playerMatchStatsRepository.create(statsData);
        }
      }

      await teamA.save();
      await teamB.save();

      const uniquePlayers = Array.from(new Set(affectedPlayerIds.map(id => id.toString()))).map(id => new Types.ObjectId(id));
      for (const pId of uniquePlayers) {
        await this.statsService.recalculatePlayerCareer(pId);
      }

      await this.statsService.recalculateTeamStats(teamA._id as Types.ObjectId);
      await this.statsService.recalculateTeamStats(teamB._id as Types.ObjectId);

      if (tournamentId) {
        await this.statsService.recalculateTournamentPointsTable(new Types.ObjectId(tournamentId));
      }

      return match;
    } catch (error) {
      throw error;
    }
  }
}
export default MatchService;
