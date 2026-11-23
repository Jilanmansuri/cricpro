import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { TeamRepository } from '../repositories/TeamRepository';
import { TeamMatchingService } from '../services/TeamMatchingService';
import { Team } from '../models/Team';
import { Match } from '../models/Match';
import { RatingService } from '../services/RatingService';

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
  const userId = (req as any).user?._id;

  try {
    const finalName = officialName || displayName || name;
    const teamExists = await teamRepository.findByName(finalName, undefined, userId);
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
      createdBy: userId
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
  const userId = (req as any).user?._id;

  try {
    const query: any = {};
    if (userId) {
      query.createdBy = userId;
    }

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
    const userId = (req as any).user?._id;
    if (!teamName) {
      res.status(400).json({ success: false, message: 'teamName is required for resolution' });
      return;
    }

    const resolution = await teamMatchingService.resolveTeamMaster(
      teamName,
      leagueContext ? { league: leagueContext } : undefined,
      undefined,
      userId
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

export const getTeamHeadToHead = async (req: Request, res: Response): Promise<void> => {
  try {
    const targetParam = (req.params.id || 'india').trim();
    const formatFilter = ((req.query.format as string) || 'all').toLowerCase().trim();

    // Resolve target team (e.g. India)
    let team: any = null;
    if (targetParam.toLowerCase() === 'india') {
      team = await Team.findOne({
        $or: [
          { name: { $regex: '^india$', $options: 'i' } },
          { shortName: { $regex: '^ind$', $options: 'i' } },
          { teamId: 'INT_IND' }
        ]
      }).lean();
    } else if (Types.ObjectId.isValid(targetParam)) {
      team = await Team.findById(targetParam).lean();
    } else {
      team = await Team.findOne({
        $or: [
          { teamId: targetParam },
          { name: { $regex: `^${targetParam}$`, $options: 'i' } },
          { shortName: { $regex: `^${targetParam}$`, $options: 'i' } }
        ]
      }).lean();
    }

    if (!team) {
      res.status(404).json({ success: false, message: 'Team not found' });
      return;
    }

    // Find all matches for this team
    const allMatches = await Match.find({
      $or: [
        { teamA: team._id },
        { teamB: team._id }
      ]
    }).populate('teamA teamB venueId').sort({ date: -1 }).lean();

    // Filter by format if requested
    const matches = allMatches.filter(m => {
      if (formatFilter === 'all') return true;
      const detected = RatingService.detectMatchFormat({ format: m.format, overs: m.overs }).toLowerCase();
      return detected === formatFilter;
    });

    const oppMap = new Map<string, any>();
    let totalPlayed = 0;
    let totalWon = 0;
    let totalLost = 0;
    let totalTied = 0;
    let totalNoResult = 0;

    for (const m of matches) {
      const isTeamA = (m.teamA as any)?._id?.toString() === team._id.toString();
      const opp = (isTeamA ? m.teamB : m.teamA) as any;
      if (!opp) continue;

      const oppId = (opp._id || opp).toString();
      const oppName = opp.name || opp.displayName || 'Unknown';

      if (!oppMap.has(oppId)) {
        oppMap.set(oppId, {
          opponentId: oppId,
          opponentName: oppName,
          opponentShortName: opp.shortName || opp.abbreviation || oppName.slice(0, 3).toUpperCase(),
          opponentLogo: opp.logo || opp.logoUrl || '',
          teamId: opp.teamId || '',
          played: 0,
          won: 0,
          lost: 0,
          tied: 0,
          noResult: 0,
          points: 0,
          runsScored: 0,
          runsConceded: 0,
          recentMatches: []
        });
      }

      const data = oppMap.get(oppId);
      data.played++;
      totalPlayed++;

      const myScore = isTeamA ? m.teamAScore : m.teamBScore;
      const oppScore = isTeamA ? m.teamBScore : m.teamAScore;

      if (myScore?.runs) data.runsScored += myScore.runs;
      if (oppScore?.runs) data.runsConceded += oppScore.runs;

      const resText = (m.result || '').toLowerCase();
      const myName = (team.name || '').toLowerCase();
      const myShort = (team.shortName || '').toLowerCase();
      const oppNameClean = oppName.toLowerCase();

      const teamWon = resText.includes(myName + ' won') ||
                      resText.includes(myShort + ' won') ||
                      (resText.includes('won by') && (resText.includes(myName) || resText.includes(myShort)));

      const oppWon = resText.includes(oppNameClean + ' won') ||
                     (resText.includes('won by') && resText.includes(oppNameClean));

      if (teamWon) {
        data.won++;
        data.points += 2;
        totalWon++;
      } else if (oppWon) {
        data.lost++;
        totalLost++;
      } else if (resText.includes('tie') || resText.includes('tied')) {
        data.tied++;
        data.points += 1;
        totalTied++;
      } else {
        data.noResult++;
        data.points += 1;
        totalNoResult++;
      }

      if (data.recentMatches.length < 5) {
        data.recentMatches.push({
          matchId: m._id,
          date: m.date,
          format: m.format || (Number(m.overs) <= 20 ? 'T20' : 'ODI'),
          result: m.result,
          teamScore: myScore ? `${myScore.runs}/${myScore.wickets ?? '-'}${myScore.overs ? ` (${myScore.overs} ov)` : ''}` : '-',
          opponentScore: oppScore ? `${oppScore.runs}/${oppScore.wickets ?? '-'}${oppScore.overs ? ` (${oppScore.overs} ov)` : ''}` : '-'
        });
      }
    }

    const opponents = Array.from(oppMap.values()).map(item => ({
      ...item,
      winPercentage: item.played > 0 ? ((item.won / item.played) * 100).toFixed(1) : '0.0'
    })).sort((a, b) => b.points - a.points || b.won - a.won || b.played - a.played);

    const overallWinPercentage = totalPlayed > 0 ? ((totalWon / totalPlayed) * 100).toFixed(1) + '%' : '0.0%';

    res.json({
      success: true,
      data: {
        team: {
          _id: team._id,
          name: team.name,
          shortName: team.shortName,
          teamId: team.teamId,
          logo: team.logo || team.logoUrl
        },
        summary: {
          totalPlayed,
          totalWon,
          totalLost,
          totalTied,
          totalNoResult,
          overallWinPercentage
        },
        format: formatFilter,
        opponents
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const triggerAutoUpdate = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { AutoUpdateService } = await import('../services/AutoUpdateService');
    const result = await AutoUpdateService.getInstance().performFullStatsUpdate();
    res.json({
      success: true,
      message: 'Automatic stats update completed successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAutoUpdateStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { AutoUpdateService } = await import('../services/AutoUpdateService');
    const status = AutoUpdateService.getInstance().getStatus();
    res.json({
      success: true,
      data: status,
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
  bulkImportTeams,
  getTeamHeadToHead,
  triggerAutoUpdate,
  getAutoUpdateStatus
};
