import { Request, Response } from 'express';
import { MatchRepository } from '../repositories/MatchRepository';
import { PlayerMatchStatsRepository } from '../repositories/PlayerMatchStatsRepository';
import { MatchService } from '../services/MatchService';

const matchRepository = new MatchRepository();
const playerMatchStatsRepository = new PlayerMatchStatsRepository();
const matchService = new MatchService();

export const getMatches = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  try {
    const total = await matchRepository.count({});
    const matches = await matchRepository.find({}, {
      page,
      limit,
      sort: { date: -1 },
      populate: ['teamA', 'teamB', 'venueId']
    });

    res.json({
      success: true,
      data: matches,
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

export const getMatchById = async (req: Request, res: Response): Promise<void> => {
  try {
    const match = await matchRepository.findById(req.params.id, ['teamA', 'teamB', 'venueId', 'mvp']);
    if (!match) {
      res.status(404).json({ success: false, message: 'Match not found' });
      return;
    }

    const playerStats = await playerMatchStatsRepository.find(
      { matchId: match._id },
      { populate: 'playerId' }
    );

    res.json({
      success: true,
      data: {
        match,
        playerStats
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const checkDuplicateMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await matchService.checkDuplicateMatch(req.body);
    res.json({
      success: true,
      isDuplicate: result.isDuplicate,
      match: result.match
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export default { getMatches, getMatchById, checkDuplicateMatch };
