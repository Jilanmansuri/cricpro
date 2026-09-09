import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { PlayerRepository } from '../repositories/PlayerRepository';
import { CareerStatsRepository } from '../repositories/CareerStatsRepository';
import { PlayerMatchStatsRepository } from '../repositories/PlayerMatchStatsRepository';
import { AiInsightsService } from '../services/AiInsightsService';

const playerRepository = new PlayerRepository();
const careerStatsRepository = new CareerStatsRepository();
const playerMatchStatsRepository = new PlayerMatchStatsRepository();

export const getPlayers = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string;

  try {
    const query: any = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const total = await playerRepository.count(query);
    const players = await playerRepository.find(query, {
      page,
      limit,
      sort: { name: 1 }
    });

    res.json({
      success: true,
      data: players,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPlayer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: 'Player name is required' });
      return;
    }
    const existing = await playerRepository.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (existing) {
      res.status(400).json({ success: false, message: 'Player already exists' });
      return;
    }
    const player = await playerRepository.create({ name });
    res.status(201).json({ success: true, data: player });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPlayerCareer = async (req: Request, res: Response): Promise<void> => {
  try {
    const playerId = new Types.ObjectId(req.params.id);
    const player = await playerRepository.findById(playerId);

    if (!player) {
      res.status(404).json({ success: false, message: 'Player not found' });
      return;
    }

    let career = await careerStatsRepository.findOne({ playerId });
    if (!career) {
      career = await careerStatsRepository.create({ playerId, playerName: player.name });
    }

    const insights = AiInsightsService.generatePlayerInsights(career);

    res.json({
      success: true,
      data: {
        player,
        career,
        insights
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPlayerHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const playerId = new Types.ObjectId(req.params.id);

    const statsList = await playerMatchStatsRepository.find(
      { playerId },
      { populate: 'matchId', sort: { createdAt: 1 } }
    );

    const history = statsList.map((stats: any) => {
      const match = stats.matchId;
      if (!match) return null;

      const batSR = stats.batting.balls > 0 
        ? parseFloat(((stats.batting.runs / stats.batting.balls) * 100).toFixed(2)) 
        : 0;

      const bowlEcon = stats.bowling.overs > 0 
        ? parseFloat((stats.bowling.runsConceded / stats.bowling.overs).toFixed(2)) 
        : 0;

      return {
        matchId: match._id,
        date: match.date,
        runs: stats.batting.runs,
        balls: stats.batting.balls,
        strikeRate: batSR,
        wickets: stats.bowling.wickets,
        runsConceded: stats.bowling.runsConceded,
        overs: stats.bowling.overs,
        economy: bowlEcon
      };
    }).filter(item => item !== null);

    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePlayer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const playerId = new Types.ObjectId(req.params.id);
    if (!name) {
      res.status(400).json({ success: false, message: 'Player name is required' });
      return;
    }
    const player = await playerRepository.update(playerId, { name });
    res.json({ success: true, data: player });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePlayer = async (req: Request, res: Response): Promise<void> => {
  try {
    const playerId = new Types.ObjectId(req.params.id);
    await playerRepository.delete(playerId);
    res.json({ success: true, message: 'Player deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const division = ((req.query.division as string) || 'all').toLowerCase();

    if (division === 'all') {
      const topBatsmen = await careerStatsRepository.find(
        { 'batting.runs': { $gt: 0 } },
        { sort: { 'batting.runs': -1 }, limit: 200, populate: 'playerId' }
      );
      
      const topBowlers = await careerStatsRepository.find(
        { 'bowling.wickets': { $gt: 0 } },
        { sort: { 'bowling.wickets': -1 }, limit: 200, populate: 'playerId' }
      );

      res.json({
        success: true,
        data: {
          division: 'all',
          topBatsmen,
          topBowlers
        }
      });
      return;
    }

    // Filter by division (International or IPL)
    let teamFilter: any = {};
    if (division === 'international') {
      teamFilter = {
        $or: [
          { teamType: 'international' },
          { teamId: { $regex: /^INT_/i } }
        ]
      };
    } else if (division === 'ipl') {
      teamFilter = {
        $or: [
          { league: { $regex: /^IPL$/i } },
          { teamType: 'franchise' },
          { teamId: { $regex: /^IPL_/i } }
        ]
      };
    }

    const { Team } = await import('../models/Team');
    const { PlayerMatchStats } = await import('../models/PlayerMatchStats');
    const { Player } = await import('../models/Player');

    const matchingTeams = await Team.find(teamFilter).select('_id');
    const matchingTeamIds = matchingTeams.map(t => t._id);

    // Aggregate Batting Stats for this division
    const battingAgg = await PlayerMatchStats.aggregate([
      { $match: { teamId: { $in: matchingTeamIds } } },
      {
        $group: {
          _id: '$playerId',
          playerName: { $first: '$playerName' },
          matches: { $sum: 1 },
          runs: { $sum: '$batting.runs' },
          balls: { $sum: '$batting.balls' },
          fours: { $sum: '$batting.fours' },
          sixes: { $sum: '$batting.sixes' },
          highestScore: { $max: '$batting.runs' },
          notOuts: {
            $sum: {
              $cond: [
                { $in: [{ $toLower: { $ifNull: ['$batting.outStatus', ''] } }, ['not_out', 'not out']] },
                1,
                0
              ]
            }
          },
          fifties: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$batting.runs', 50] },
                    { $lt: ['$batting.runs', 100] }
                  ]
                },
                1,
                0
              ]
            }
          },
          hundreds: {
            $sum: {
              $cond: [
                { $gte: ['$batting.runs', 100] },
                1,
                0
              ]
            }
          }
        }
      },
      { $match: { runs: { $gt: 0 } } },
      { $sort: { runs: -1 } },
      { $limit: 200 }
    ]);

    // Aggregate Bowling Stats for this division
    const bowlingAgg = await PlayerMatchStats.aggregate([
      { $match: { teamId: { $in: matchingTeamIds } } },
      {
        $group: {
          _id: '$playerId',
          playerName: { $first: '$playerName' },
          overs: { $sum: '$bowling.overs' },
          maidens: { $sum: '$bowling.maidens' },
          runsConceded: { $sum: '$bowling.runsConceded' },
          wickets: { $sum: '$bowling.wickets' }
        }
      },
      { $match: { wickets: { $gt: 0 } } },
      { $sort: { wickets: -1 } },
      { $limit: 200 }
    ]);

    // Populate player info so it matches CareerStats structure
    const playerIds = Array.from(new Set([...battingAgg.map(b => b._id), ...bowlingAgg.map(b => b._id)]));
    const playersList = await Player.find({ _id: { $in: playerIds } }).select('_id name');
    const playerMap = new Map(playersList.map(p => [p._id.toString(), p]));

    const topBatsmen = battingAgg.map(b => {
      const pDoc = playerMap.get(b._id?.toString());
      return {
        _id: b._id,
        playerId: pDoc ? { _id: pDoc._id, name: pDoc.name } : { _id: b._id, name: b.playerName || 'Player' },
        playerName: pDoc?.name || b.playerName,
        batting: {
          matches: b.matches,
          runs: b.runs,
          balls: b.balls,
          fours: b.fours,
          sixes: b.sixes,
          fifties: b.fifties,
          hundreds: b.hundreds,
          highestScore: b.highestScore,
          notOuts: b.notOuts
        }
      };
    });

    const topBowlers = bowlingAgg.map(bw => {
      const pDoc = playerMap.get(bw._id?.toString());
      return {
        _id: bw._id,
        playerId: pDoc ? { _id: pDoc._id, name: pDoc.name } : { _id: bw._id, name: bw.playerName || 'Player' },
        playerName: pDoc?.name || bw.playerName,
        bowling: {
          overs: bw.overs,
          maidens: bw.maidens,
          runsConceded: bw.runsConceded,
          wickets: bw.wickets
        }
      };
    });

    res.json({
      success: true,
      data: {
        division,
        topBatsmen,
        topBowlers
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
