import { Types } from 'mongoose';
import { TournamentRepository } from '../repositories/TournamentRepository';
import { PointsTableRepository } from '../repositories/PointsTableRepository';
import { MatchRepository } from '../repositories/MatchRepository';
import { PlayerMatchStats } from '../models/PlayerMatchStats';
import { Match } from '../models/Match';
import { ITournament } from '../types';

export class TournamentService {
  private tournamentRepository: TournamentRepository;
  private pointsTableRepository: PointsTableRepository;
  private matchRepository: MatchRepository;

  constructor() {
    this.tournamentRepository = new TournamentRepository();
    this.pointsTableRepository = new PointsTableRepository();
    this.matchRepository = new MatchRepository();
  }

  public async createTournament(payload: any): Promise<ITournament> {
    const { name, startDate, endDate, organizerId } = payload;
    return await this.tournamentRepository.create({
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      organizer: new Types.ObjectId(organizerId),
    });
  }

  public async getStandings(tournamentId: string): Promise<any[]> {
    return await this.pointsTableRepository.find(
      { tournamentId: new Types.ObjectId(tournamentId) },
      { populate: 'teamId', sort: { points: -1, nrr: -1 } }
    );
  }

  public async getLeaders(tournamentId: string): Promise<any> {
    const tId = new Types.ObjectId(tournamentId);
    const matches = await this.matchRepository.find({ tournamentId: tId });
    const matchIds = matches.map(m => m._id);

    if (matchIds.length === 0) {
      return { orangeCap: [], purpleCap: [], mvps: [] };
    }

    // 1. Orange Cap Aggregation
    const orangeCap = await PlayerMatchStats.aggregate([
      { $match: { matchId: { $in: matchIds } } },
      {
        $group: {
          _id: '$playerId',
          runs: { $sum: '$batting.runs' },
          balls: { $sum: '$batting.balls' },
          fours: { $sum: '$batting.fours' },
          sixes: { $sum: '$batting.sixes' },
          matches: { $sum: 1 }
        }
      },
      { $sort: { runs: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'players',
          localField: '_id',
          foreignField: '_id',
          as: 'player'
        }
      },
      { $unwind: '$player' }
    ]);

    // 2. Purple Cap Aggregation
    const purpleCap = await PlayerMatchStats.aggregate([
      { $match: { matchId: { $in: matchIds } } },
      {
        $group: {
          _id: '$playerId',
          wickets: { $sum: '$bowling.wickets' },
          runsConceded: { $sum: '$bowling.runsConceded' },
          matches: { $sum: 1 }
        }
      },
      { $sort: { wickets: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'players',
          localField: '_id',
          foreignField: '_id',
          as: 'player'
        }
      },
      { $unwind: '$player' }
    ]);

    // 3. MVP Aggregation
    const mvps = await Match.aggregate([
      { $match: { tournamentId: tId, mvp: { $exists: true } } },
      {
        $group: {
          _id: '$mvp',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'players',
          localField: '_id',
          foreignField: '_id',
          as: 'player'
        }
      },
      { $unwind: '$player' }
    ]);

    return {
      orangeCap: orangeCap.map(c => ({
        playerId: c._id,
        name: c.player.name,
        runs: c.runs,
        balls: c.balls,
        fours: c.fours,
        sixes: c.sixes,
        matches: c.matches
      })),
      purpleCap: purpleCap.map(c => ({
        playerId: c._id,
        name: c.player.name,
        wickets: c.wickets,
        runsConceded: c.runsConceded,
        matches: c.matches
      })),
      mvps: mvps.map(c => ({
        playerId: c._id,
        name: c.player.name,
        count: c.count
      }))
    };
  }
}
export default TournamentService;
