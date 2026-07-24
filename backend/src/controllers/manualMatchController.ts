import { Request, Response } from 'express';
import { MatchService } from '../services/MatchService';

const matchService = new MatchService();

export const saveManualMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const match = await matchService.saveMatch(req.body);
    res.status(201).json({
      success: true,
      message: 'Match stats saved successfully and career engines updated',
      data: match
    });
  } catch (error: any) {
    console.error('Match saving failed:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};
