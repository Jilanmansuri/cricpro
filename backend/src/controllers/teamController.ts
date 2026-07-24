import { Request, Response } from 'express';
import { TeamRepository } from '../repositories/TeamRepository';

const teamRepository = new TeamRepository();

export const createTeam = async (req: Request, res: Response): Promise<void> => {
  const { name, logo } = req.body;

  try {
    const teamExists = await teamRepository.findByName(name);
    if (teamExists) {
      res.status(400).json({ success: false, message: 'Team with this name already exists' });
      return;
    }

    const team = await teamRepository.create({
      name,
      logo: logo || '',
    });

    res.status(201).json({
      success: true,
      data: team
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTeams = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string;

  try {
    const query: any = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const total = await teamRepository.count(query);
    const teams = await teamRepository.find(query, {
      page,
      limit,
      sort: { 'stats.points': -1, 'stats.nrr': -1 }
    });

    res.json({
      success: true,
      data: teams,
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

export const getTeamById = async (req: Request, res: Response): Promise<void> => {
  try {
    const team = await teamRepository.findById(req.params.id, 'players');
    if (!team) {
      res.status(404).json({ success: false, message: 'Team not found' });
      return;
    }

    res.json({
      success: true,
      data: team
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
