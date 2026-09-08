import { Request, Response } from 'express';
import { TeamRepository } from '../repositories/TeamRepository';
import { TeamMatchingService } from '../services/TeamMatchingService';

const teamRepository = new TeamRepository();
const teamMatchingService = new TeamMatchingService();

export const createTeam = async (req: Request, res: Response): Promise<void> => {
  const {
    name,
    officialName,
    displayName,
    shortName,
    abbreviation,
    aliases,
    teamType,
    country,
    league,
    logo,
    logoUrl,
    teamId
  } = req.body;

  try {
    const finalName = officialName || displayName || name;
    const teamExists = await teamRepository.findByName(finalName);
    if (teamExists) {
      res.status(400).json({ success: false, message: 'Team with this name already exists' });
      return;
    }

    const team = await teamRepository.create({
      teamId: teamId || abbreviation || finalName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8),
      officialName: officialName || finalName,
      displayName: displayName || finalName,
      shortName: shortName || finalName,
      abbreviation: abbreviation || '',
      aliases: Array.isArray(aliases) ? aliases.map((a: string) => a.toLowerCase().trim()) : [],
      teamType: teamType || 'other',
      country: country || '',
      league: league || '',
      logo: logo || logoUrl || '',
      logoUrl: logoUrl || logo || '',
      isActive: true,
      name: finalName,
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
  const limit = parseInt(req.query.limit as string) || 20;
  const search = (req.query.search as string || '').trim();
  const teamType = req.query.teamType as string;
  const league = req.query.league as string;
  const country = req.query.country as string;
  const isActive = req.query.isActive as string;

  try {
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { officialName: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { shortName: { $regex: search, $options: 'i' } },
        { abbreviation: { $regex: search, $options: 'i' } },
        { teamId: { $regex: search, $options: 'i' } },
        { aliases: { $regex: search, $options: 'i' } },
      ];
    }

    if (teamType) query.teamType = teamType;
    if (league) query.league = { $regex: league, $options: 'i' };
    if (country) query.country = { $regex: country, $options: 'i' };
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const total = await teamRepository.count(query);
    const teams = await teamRepository.find(query, {
      page,
      limit,
      sort: { displayName: 1, name: 1 }
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

export const getTeamByTeamId = async (req: Request, res: Response): Promise<void> => {
  try {
    const team = await teamRepository.findByTeamId(req.params.teamId);
    if (!team) {
      res.status(404).json({ success: false, message: `Team with teamId '${req.params.teamId}' not found` });
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

export const resolveTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamName, leagueContext } = req.body;
    if (!teamName) {
      res.status(400).json({ success: false, message: 'teamName is required for resolution' });
      return;
    }

    const resolution = await teamMatchingService.resolveTeamMaster(
      teamName,
      leagueContext ? { league: leagueContext } : undefined
    );

    res.json({
      success: true,
      data: resolution
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bulkImportTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teams } = req.body;
    if (!Array.isArray(teams) || teams.length === 0) {
      res.status(400).json({ success: false, message: 'teams must be a non-empty array' });
      return;
    }

    const imported: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < teams.length; i++) {
      const item = teams[i];
      try {
        const official = item.officialName || item.name;
        const display = item.displayName || item.shortName || official;
        const abbr = item.abbreviation || item.shortName || '';
        const tId = item.teamId || abbr || official.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

        const upsertData = {
          teamId: tId,
          officialName: official,
          displayName: display,
          shortName: item.shortName || display,
          abbreviation: abbr,
          aliases: Array.isArray(item.aliases) ? item.aliases : [],
          teamType: item.teamType || 'other',
          country: item.country || '',
          league: item.league || '',
          logo: item.logo || item.logoUrl || '',
          logoUrl: item.logoUrl || item.logo || '',
          isActive: item.isActive !== undefined ? item.isActive : true,
          name: official
        };

        const doc = await teamRepository.upsertMasterTeam(upsertData);
        imported.push({ teamId: doc.teamId, name: doc.name, id: doc._id });
      } catch (err: any) {
        errors.push({ index: i, item, error: err.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `Bulk imported ${imported.length} Team Master records successfully`,
      data: {
        totalReceived: teams.length,
        importedCount: imported.length,
        errorCount: errors.length,
        imported,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  createTeam,
  getTeams,
  getTeamById,
  getTeamByTeamId,
  resolveTeam,
  bulkImportTeams
};
