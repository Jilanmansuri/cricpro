import { Request, Response } from 'express';
import { VenueRepository } from '../repositories/VenueRepository';
import { MatchRepository } from '../repositories/MatchRepository';

const venueRepository = new VenueRepository();
const matchRepository = new MatchRepository();

/**
 * Get all venues for the logged in user + recently used venues in their matches
 */
export const getVenues = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;
    const query: any = {};
    if (userId) {
      query.createdBy = userId;
    }

    // 1. Fetch user's venues from Venue collection
    const userVenues = await venueRepository.find(query, { sort: { updatedAt: -1 }, limit: 50 });

    // 2. Also fetch any populated distinct venue names from user's matches
    const recentMatches = await matchRepository.find(
      query,
      { sort: { date: -1 }, limit: 50, populate: 'venueId' }
    );

    const venueMap = new Map<string, { id?: string; name: string; location?: string }>();

    userVenues.forEach((v: any) => {
      if (v.name) {
        venueMap.set(v.name.toLowerCase().trim(), {
          id: v._id,
          name: v.name,
          location: v.location || '',
        });
      }
    });

    recentMatches.forEach((m: any) => {
      if (m.venueId && m.venueId.name) {
        const key = m.venueId.name.toLowerCase().trim();
        if (!venueMap.has(key)) {
          venueMap.set(key, {
            id: m.venueId._id,
            name: m.venueId.name,
            location: m.venueId.location || '',
          });
        }
      }
    });

    const list = Array.from(venueMap.values());

    res.json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create or resolve a venue for the current user
 */
export const createVenue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, location } = req.body;
    const userId = (req as any).user?._id;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Venue name is required' });
      return;
    }

    const trimmedName = name.trim();
    let venue = await venueRepository.findByName(trimmedName, undefined, userId);

    if (!venue) {
      venue = await venueRepository.create({
        name: trimmedName,
        location: (location || '').trim(),
        createdBy: userId,
      });
    }

    res.status(201).json({
      success: true,
      data: venue,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
