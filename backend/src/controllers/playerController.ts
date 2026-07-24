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
      career = await careerStatsRepository.create({ playerId });
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

export const getLeaderboard = async (_req: Request, res: Response): Promise<void> => {
  try {
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
        topBatsmen,
        topBowlers
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
