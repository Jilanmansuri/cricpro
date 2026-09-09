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

const TEAM_META_MAP: Record<string, { flag: string; shortName: string; color: string }> = {
  'INT_IND': { flag: '🇮🇳', shortName: 'IND', color: '#138808' },
  'INT_AUS': { flag: '🇦🇺', shortName: 'AUS', color: '#FFCD00' },
  'INT_ENG': { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', shortName: 'ENG', color: '#002B7F' },
  'INT_RSA': { flag: '🇿🇦', shortName: 'SA', color: '#007A3D' },
  'INT_NZL': { flag: '🇳🇿', shortName: 'NZ', color: '#000000' },
  'INT_PAK': { flag: '🇵🇰', shortName: 'PAK', color: '#115740' },
  'INT_SRI': { flag: '🇱🇰', shortName: 'SL', color: '#8D153A' },
  'INT_WI': { flag: '🌴', shortName: 'WI', color: '#7B002C' },
  'INT_AFG': { flag: '🇦🇫', shortName: 'AFG', color: '#007A3D' },
  'INT_BAN': { flag: '🇧🇩', shortName: 'BAN', color: '#006A4E' },
  'INT_ZIM': { flag: '🇿🇼', shortName: 'ZIM', color: '#DE2010' },
  'INT_IRE': { flag: '🇮🇪', shortName: 'IRE', color: '#169B62' },
  'IPL_CSK': { flag: '🦁', shortName: 'CSK', color: '#FDB913' },
  'IPL_MI': { flag: '🌀', shortName: 'MI', color: '#004BA0' },
  'IPL_RCB': { flag: '🔴', shortName: 'RCB', color: '#EC1C24' },
  'IPL_KKR': { flag: '⚔️', shortName: 'KKR', color: '#3A225D' },
  'IPL_DC': { flag: '🐯', shortName: 'DC', color: '#0078FF' },
  'IPL_GT': { flag: '⚡', shortName: 'GT', color: '#1B2133' },
  'IPL_RR': { flag: '👑', shortName: 'RR', color: '#EA1A85' },
  'IPL_SRH': { flag: '🦅', shortName: 'SRH', color: '#F26522' },
  'IPL_LSG': { flag: '🏏', shortName: 'LSG', color: '#0057E7' },
  'IPL_PBKS': { flag: '🦁', shortName: 'PBKS', color: '#ED1B24' },
};

function formatTeamInfo(teamDoc: any) {
  if (!teamDoc) return null;
  const teamId = teamDoc.teamId || '';
  const meta = TEAM_META_MAP[teamId] || {};
  const name = teamDoc.displayName || teamDoc.officialName || teamDoc.name || 'Team';
  return {
    name,
    shortName: meta.shortName || teamDoc.shortName || teamDoc.abbreviation || name.slice(0, 3).toUpperCase(),
    flag: meta.flag || (teamDoc.teamType === 'international' ? '🇮🇳' : '🏏'),
    logo: teamDoc.logoUrl || teamDoc.logo || null,
    color: meta.color || '#007AFF'
  };
}

export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const division = ((req.query.division as string) || 'all').toLowerCase();
    const { Team } = await import('../models/Team');
    const { PlayerMatchStats } = await import('../models/PlayerMatchStats');
    const { Player } = await import('../models/Player');

    const allTeams = await Team.find({}).lean();
    const teamMap = new Map(allTeams.map(t => [t._id.toString(), t]));
    const playerToTeamMap = new Map<string, any>();

    for (const t of allTeams) {
      if (t.players && Array.isArray(t.players)) {
        for (const p of t.players) {
          if (!playerToTeamMap.has(p.toString())) {
            playerToTeamMap.set(p.toString(), formatTeamInfo(t));
          }
        }
      }
    }

    if (division === 'all') {
      const topBatsmenDocs = await careerStatsRepository.find(
        { 'batting.runs': { $gt: 0 } },
        { sort: { 'batting.runs': -1 }, limit: 200, populate: 'playerId' }
      );
      
      const topBowlersDocs = await careerStatsRepository.find(
        { 'bowling.wickets': { $gt: 0 } },
        { sort: { 'bowling.wickets': -1 }, limit: 200, populate: 'playerId' }
      );

      const topBatsmen = topBatsmenDocs.map((item: any) => {
        const pIdStr = item.playerId?._id?.toString() || item.playerId?.toString();
        return {
          ...item.toObject ? item.toObject() : item,
          team: playerToTeamMap.get(pIdStr) || null
        };
      });

      const topBowlers = topBowlersDocs.map((item: any) => {
        const pIdStr = item.playerId?._id?.toString() || item.playerId?.toString();
        return {
          ...item.toObject ? item.toObject() : item,
          team: playerToTeamMap.get(pIdStr) || null
        };
      });

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

    const matchingTeams = await Team.find(teamFilter).select('_id');
    const matchingTeamIds = matchingTeams.map(t => t._id);

    // Aggregate Batting Stats for this division
    const battingAgg = await PlayerMatchStats.aggregate([
      { $match: { teamId: { $in: matchingTeamIds } } },
      {
        $group: {
          _id: '$playerId',
          playerName: { $first: '$playerName' },
          lastTeamId: { $last: '$teamId' },
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
          lastTeamId: { $last: '$teamId' },
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
      const pIdStr = b._id?.toString();
      const teamInfo = playerToTeamMap.get(pIdStr) || formatTeamInfo(teamMap.get(b.lastTeamId?.toString())) || null;

      return {
        _id: b._id,
        playerId: pDoc ? { _id: pDoc._id, name: pDoc.name } : { _id: b._id, name: b.playerName || 'Player' },
        playerName: pDoc?.name || b.playerName,
        team: teamInfo,
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
      const pIdStr = bw._id?.toString();
      const teamInfo = playerToTeamMap.get(pIdStr) || formatTeamInfo(teamMap.get(bw.lastTeamId?.toString())) || null;

      return {
        _id: bw._id,
        playerId: pDoc ? { _id: pDoc._id, name: pDoc.name } : { _id: bw._id, name: bw.playerName || 'Player' },
        playerName: pDoc?.name || bw.playerName,
        team: teamInfo,
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
