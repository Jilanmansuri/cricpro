import { Request, Response } from 'express';
import { TournamentService } from '../services/TournamentService';
import { TournamentRepository } from '../repositories/TournamentRepository';
import { AuthRequest } from '../middlewares/authMiddleware';

const tournamentService = new TournamentService();
const tournamentRepository = new TournamentRepository();

export const createTournament = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const payload = {
      name: req.body.name,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      organizerId: req.user._id
    };

    const tournament = await tournamentService.createTournament(payload);
    res.status(201).json({
      success: true,
      data: tournament
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTournaments = async (_req: Request, res: Response): Promise<void> => {
  try {
    const tournaments = await tournamentRepository.find({}, { sort: { startDate: -1 } });
    res.json({
      success: true,
      data: tournaments
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTournamentStandings = async (req: Request, res: Response): Promise<void> => {
  try {
    const standings = await tournamentService.getStandings(req.params.id);
    res.json({
      success: true,
      data: standings
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTournamentLeaders = async (req: Request, res: Response): Promise<void> => {
  try {
    const leaders = await tournamentService.getLeaders(req.params.id);
    res.json({
      success: true,
      data: leaders
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
