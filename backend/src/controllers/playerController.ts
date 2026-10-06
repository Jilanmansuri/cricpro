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
  const userId = (req as any).user?._id;

  try {
    const query: any = {};
    if (userId) {
      query.createdBy = userId;
    }
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
    const userId = (req as any).user?._id;
    if (!name) {
      res.status(400).json({ success: false, message: 'Player name is required' });
      return;
    }
    const filter: any = { name: { $regex: `^${name}$`, $options: 'i' } };
    if (userId) filter.createdBy = userId;
    const existing = await playerRepository.findOne(filter);
    if (existing) {
      res.status(400).json({ success: false, message: 'Player already exists' });
      return;
    }
    const player = await playerRepository.create({ name, createdBy: userId });
    res.status(201).json({ success: true, data: player });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPlayerCareer = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    let playerId = new Types.ObjectId(rawId);
    let player = await playerRepository.findById(playerId);

    // Fallback: If id is a CareerStats document ID rather than Player ID
    if (!player) {
      const careerDoc = await careerStatsRepository.findById(playerId);
      if (careerDoc && careerDoc.playerId) {
        player = await playerRepository.findById(careerDoc.playerId);
        if (player) {
          playerId = careerDoc.playerId as Types.ObjectId;
        }
      }
    }

    if (!player) {
      res.status(404).json({ success: false, message: 'Player not found' });
      return;
    }

    let career = await careerStatsRepository.findOne({ playerId });
    if (!career) {
      career = await careerStatsRepository.create({ playerId, playerName: player.name });
    }

    const { PlayerMatchStats } = await import('../models/PlayerMatchStats');
    const battingInningsCount = await PlayerMatchStats.countDocuments({
      playerId,
      'batting.didNotBat': { $ne: true }
    });
    const bowlingInningsCount = await PlayerMatchStats.countDocuments({
      playerId,
      'bowling.didNotBowl': { $ne: true }
    });

    const careerObj: any = career.toObject ? career.toObject() : { ...career };
    careerObj.batting = {
      ...careerObj.batting,
      innings: careerObj.batting?.innings ? careerObj.batting.innings : battingInningsCount
    };
    careerObj.bowling = {
      ...careerObj.bowling,
      innings: careerObj.bowling?.innings ? careerObj.bowling.innings : bowlingInningsCount
    };

    const insights = AiInsightsService.generatePlayerInsights(careerObj);

    res.json({
      success: true,
      data: {
        player,
        career: careerObj,
        insights
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPlayerHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    let playerId = new Types.ObjectId(rawId);

    // Fallback: If id is a CareerStats document ID rather than Player ID
    const directPlayer = await playerRepository.findById(playerId);
    if (!directPlayer) {
      const careerDoc = await careerStatsRepository.findById(playerId);
      if (careerDoc && careerDoc.playerId) {
        playerId = careerDoc.playerId as Types.ObjectId;
      }
    }

    const statsList = await playerMatchStatsRepository.find(
      { playerId },
      {
        populate: [
          {
            path: 'matchId',
            populate: [
              { path: 'teamA', select: 'name shortName logo flag teamId' },
              { path: 'teamB', select: 'name shortName logo flag teamId' },
              { path: 'mvp', select: 'name' }
            ]
          },
          { path: 'teamId', select: 'name shortName logo flag teamId' }
        ],
        sort: { createdAt: -1 }
      }
    );

    const history = statsList.map((stats: any) => {
      const match = stats.matchId;
      if (!match) return null;

      const playerTeam = stats.teamId;
      let opponentTeam: any = null;
      if (match.teamA && match.teamB) {
        if (playerTeam && match.teamA._id?.toString() === playerTeam._id?.toString()) {
          opponentTeam = match.teamB;
        } else if (playerTeam && match.teamB._id?.toString() === playerTeam._id?.toString()) {
          opponentTeam = match.teamA;
        } else if (match.teamA.name === playerTeam?.name) {
          opponentTeam = match.teamB;
        } else {
          opponentTeam = match.teamA;
        }
      }

      const batRuns = Number(stats.batting?.runs) || 0;
      const batBalls = Number(stats.batting?.balls) || 0;
      const batFours = Number(stats.batting?.fours) || 0;
      const batSixes = Number(stats.batting?.sixes) || 0;
      const outStatus = stats.batting?.outStatus || (stats.batting?.didNotBat ? 'dnb' : 'not_out');

      const batSR = batBalls > 0 
        ? parseFloat(((batRuns / batBalls) * 100).toFixed(2)) 
        : 0;

      const oversNum = Number(stats.bowling?.overs) || 0;
      const runsConceded = Number(stats.bowling?.runsConceded) || 0;
      const wickets = Number(stats.bowling?.wickets) || 0;
      const maidens = Number(stats.bowling?.maidens) || 0;

      const bowlEcon = oversNum > 0 
        ? parseFloat((runsConceded / oversNum).toFixed(2)) 
        : 0;

      const oversLimit = Number(match.overs) || 20;
      const format = oversLimit <= 10 ? 'T10' : oversLimit <= 20 ? 'T20' : oversLimit <= 50 ? 'ODI' : 'Custom';

      const isMvp = match.mvp 
        ? (match.mvp._id?.toString() === playerId.toString() || match.mvp.name?.toLowerCase() === stats.playerName?.toLowerCase())
        : false;

      return {
        matchId: match._id,
        date: match.date || match.createdAt,
        format,
        matchOvers: match.overs,
        result: match.result || '',
        playerTeam: playerTeam ? {
          name: playerTeam.name,
          shortName: playerTeam.shortName || playerTeam.name,
          flag: playerTeam.flag || '',
          logo: playerTeam.logo || '',
          teamId: playerTeam.teamId || ''
        } : null,
        opponentTeam: opponentTeam ? {
          name: opponentTeam.name,
          shortName: opponentTeam.shortName || opponentTeam.name,
          flag: opponentTeam.flag || '',
          logo: opponentTeam.logo || '',
          teamId: opponentTeam.teamId || ''
        } : null,
        batting: {
          runs: batRuns,
          balls: batBalls,
          fours: batFours,
          sixes: batSixes,
          outStatus,
          strikeRate: batSR,
          didNotBat: !!stats.batting?.didNotBat,
          fastestFiftyBalls: stats.batting?.fastestFiftyBalls || null,
          fastestHundredBalls: stats.batting?.fastestHundredBalls || null
        },
        bowling: {
          overs: oversNum,
          maidens,
          runsConceded,
          wickets,
          economy: bowlEcon,
          didNotBowl: !!stats.bowling?.didNotBowl
        },
        fielding: {
          catches: stats.fielding?.catches || 0,
          stumpings: stats.fielding?.stumpings || 0,
          runOuts: stats.fielding?.runOuts || 0
        },
        isMvp,
        // Flat legacy fields for chart backwards compatibility
        runs: batRuns,
        balls: batBalls,
        strikeRate: batSR,
        wickets,
        runsConceded,
        overs: oversNum,
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

function resolvePlayerTeam(
  playerDoc: any,
  division: string,
  lastTeamId: any,
  teamMap: Map<string, any>,
  teamByCodeMap: Map<string, any>,
  playerToTeamMap: Map<string, any>
) {
  if (!playerDoc) return null;

  const natCode = playerDoc.nationalTeamId;
  const iplCode = playerDoc.iplTeamId;
  const country = playerDoc.country;

  // 1. If looking at IPL division, prioritize player's IPL franchise
  if (division === 'ipl') {
    if (iplCode && teamByCodeMap.has(iplCode)) {
      return formatTeamInfo(teamByCodeMap.get(iplCode));
    }
  }

  // 2. If looking at International division, prioritize player's country / national team
  if (division === 'international') {
    if (natCode && teamByCodeMap.has(natCode)) {
      return formatTeamInfo(teamByCodeMap.get(natCode));
    }
    if (country && country.toLowerCase() === 'india' && teamByCodeMap.has('INT_IND')) {
      return formatTeamInfo(teamByCodeMap.get('INT_IND'));
    }
  }

  // 3. For 'all' division:
  if (division === 'all') {
    // If player has a national team, prefer that (e.g. India)
    if (natCode && teamByCodeMap.has(natCode)) {
      return formatTeamInfo(teamByCodeMap.get(natCode));
    }
    if (country && country.toLowerCase() === 'india' && teamByCodeMap.has('INT_IND')) {
      return formatTeamInfo(teamByCodeMap.get('INT_IND'));
    }
    if (iplCode && teamByCodeMap.has(iplCode)) {
      return formatTeamInfo(teamByCodeMap.get(iplCode));
    }
  }

  // 4. Fallback to last team from match stats if valid
  if (lastTeamId && teamMap.has(lastTeamId.toString())) {
    return formatTeamInfo(teamMap.get(lastTeamId.toString()));
  }

  // 5. Fallback to playerToTeamMap
  const pIdStr = playerDoc._id?.toString();
  if (pIdStr && playerToTeamMap.has(pIdStr)) {
    return playerToTeamMap.get(pIdStr);
  }

  return null;
}

export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const division = ((req.query.division as string) || 'all').toLowerCase();
    const userId = (req as any).user?._id;
    const { Team } = await import('../models/Team');
    const { PlayerMatchStats } = await import('../models/PlayerMatchStats');
    const { Player } = await import('../models/Player');

    const userTeamFilter: any = userId ? { createdBy: userId } : {};
    const allTeams = await Team.find(userTeamFilter).lean();
    const teamMap = new Map(allTeams.map(t => [t._id.toString(), t]));
    const teamByCodeMap = new Map<string, any>(allTeams.filter(t => !!t.teamId).map(t => [t.teamId as string, t]));
    const playerToTeamMap = new Map<string, any>();

    const userPlayerFilter: any = userId ? { createdBy: userId } : {};
    const userPlayers = await Player.find(userPlayerFilter).select('_id');
    const userPlayerIds = userPlayers.map(p => p._id);

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
      const baseFilter: any = { 'batting.runs': { $gt: 0 } };
      if (userId) baseFilter.playerId = { $in: userPlayerIds };
      const topBatsmenDocs = await careerStatsRepository.find(
        baseFilter,
        { sort: { 'batting.runs': -1 }, limit: 200, populate: 'playerId' }
      );
      
      const bowlFilter: any = { 'bowling.wickets': { $gt: 0 } };
      if (userId) bowlFilter.playerId = { $in: userPlayerIds };
      const topBowlersDocs = await careerStatsRepository.find(
        bowlFilter,
        { sort: { 'bowling.wickets': -1 }, limit: 200, populate: 'playerId' }
      );

      const topBatsmen = topBatsmenDocs.map((item: any) => {
        const pDoc = item.playerId;
        const teamInfo = resolvePlayerTeam(pDoc, 'all', null, teamMap, teamByCodeMap, playerToTeamMap);
        const playerObj = pDoc ? { _id: pDoc._id, name: pDoc.name, country: pDoc.country, nationalTeamId: pDoc.nationalTeamId, iplTeamId: pDoc.iplTeamId } : { _id: item.playerId || item._id, name: item.playerName || 'Player' };
        return {
          ...item.toObject ? item.toObject() : item,
          playerId: playerObj,
          playerProfileId: playerObj._id,
          team: teamInfo
        };
      });

      const topBowlers = topBowlersDocs.map((item: any) => {
        const pDoc = item.playerId;
        const teamInfo = resolvePlayerTeam(pDoc, 'all', null, teamMap, teamByCodeMap, playerToTeamMap);
        const playerObj = pDoc ? { _id: pDoc._id, name: pDoc.name, country: pDoc.country, nationalTeamId: pDoc.nationalTeamId, iplTeamId: pDoc.iplTeamId } : { _id: item.playerId || item._id, name: item.playerName || 'Player' };
        return {
          ...item.toObject ? item.toObject() : item,
          playerId: playerObj,
          playerProfileId: playerObj._id,
          team: teamInfo
        };
      });

      const mvpFilter: any = { mvps: { $gt: 0 } };
      if (userId) mvpFilter.playerId = { $in: userPlayerIds };
      const topMvpsDocs = await careerStatsRepository.find(
        mvpFilter,
        { sort: { mvps: -1, 'batting.runs': -1 }, limit: 200, populate: 'playerId' }
      );

      const topMvps = topMvpsDocs.map((item: any) => {
        const pDoc = item.playerId;
        const teamInfo = resolvePlayerTeam(pDoc, 'all', null, teamMap, teamByCodeMap, playerToTeamMap);
        const playerObj = pDoc ? { _id: pDoc._id, name: pDoc.name, country: pDoc.country, nationalTeamId: pDoc.nationalTeamId, iplTeamId: pDoc.iplTeamId } : { _id: item.playerId || item._id, name: item.playerName || 'Player' };
        return {
          ...item.toObject ? item.toObject() : item,
          playerId: playerObj,
          playerProfileId: playerObj._id,
          team: teamInfo
        };
      });

      res.json({
        success: true,
        data: {
          division: 'all',
          topBatsmen,
          topBowlers,
          topMvps
        }
      });
      return;
    }

    // Filter by division (International or IPL)
    let teamFilter: any = {};
    if (division === 'international') {
      teamFilter = {
        $or: [
          { teamId: 'INT_IND' },
          { name: { $regex: /^india$/i } }
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
    if (userId) {
      teamFilter.createdBy = userId;
    }

    const matchingTeams = await Team.find(teamFilter).select('_id');
    const matchingTeamIds = matchingTeams.map(t => t._id);

    const matchStatsFilter: any = { teamId: { $in: matchingTeamIds } };
    if (userId) matchStatsFilter.playerId = { $in: userPlayerIds };

    // Aggregate Batting Stats for this division
    const battingAgg = await PlayerMatchStats.aggregate([
      { $match: matchStatsFilter },
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
          },
          fastestFifty: {
            $min: {
              $cond: [
                { $gt: ['$batting.fastestFiftyBalls', 0] },
                '$batting.fastestFiftyBalls',
                '$$REMOVE'
              ]
            }
          },
          fastestHundred: {
            $min: {
              $cond: [
                { $gt: ['$batting.fastestHundredBalls', 0] },
                '$batting.fastestHundredBalls',
                '$$REMOVE'
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
      { $match: matchStatsFilter },
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
    const playersList = await Player.find({ _id: { $in: playerIds } }).select('_id name fullName country nationalTeamId iplTeamId');
    const playerMap = new Map(playersList.map(p => [p._id.toString(), p]));

    const { CareerStats } = await import('../models/CareerStats');
    const careerDocs = await CareerStats.find({ playerId: { $in: playerIds } }).select('playerId mvps').lean();
    const mvpMap = new Map(careerDocs.map((c: any) => [c.playerId.toString(), c.mvps || 0]));

    const topBatsmen = battingAgg.map(b => {
      const pDoc = playerMap.get(b._id?.toString());
      const teamInfo = resolvePlayerTeam(pDoc, division, b.lastTeamId, teamMap, teamByCodeMap, playerToTeamMap);

      return {
        _id: b._id,
        playerId: pDoc ? { _id: pDoc._id, name: pDoc.name } : { _id: b._id, name: b.playerName || 'Player' },
        playerName: pDoc?.name || b.playerName,
        team: teamInfo,
        mvps: mvpMap.get(b._id?.toString()) || 0,
        batting: {
          matches: b.matches,
          runs: b.runs,
          balls: b.balls,
          fours: b.fours,
          sixes: b.sixes,
          fifties: b.fifties,
          hundreds: b.hundreds,
          highestScore: b.highestScore,
          notOuts: b.notOuts,
          fastestFifty: b.fastestFifty || null,
          fastestHundred: b.fastestHundred || null
        }
      };
    });

    const topBowlers = bowlingAgg.map(bw => {
      const pDoc = playerMap.get(bw._id?.toString());
      const teamInfo = resolvePlayerTeam(pDoc, division, bw.lastTeamId, teamMap, teamByCodeMap, playerToTeamMap);

      return {
        _id: bw._id,
        playerId: pDoc ? { _id: pDoc._id, name: pDoc.name } : { _id: bw._id, name: bw.playerName || 'Player' },
        playerName: pDoc?.name || bw.playerName,
        team: teamInfo,
        mvps: mvpMap.get(bw._id?.toString()) || 0,
        bowling: {
          overs: bw.overs,
          maidens: bw.maidens,
          runsConceded: bw.runsConceded,
          wickets: bw.wickets
        }
      };
    });

    const topMvpFilter: any = { mvps: { $gt: 0 } };
    if (userPlayerIds.length > 0) topMvpFilter.playerId = { $in: userPlayerIds };
    const topMvpCareerDocs = await CareerStats.find(topMvpFilter)
      .sort({ mvps: -1, 'batting.runs': -1 })
      .limit(100)
      .populate('playerId');

    const topMvps = topMvpCareerDocs.map((item: any) => {
      const pDoc = item.playerId;
      const teamInfo = resolvePlayerTeam(pDoc, division, null, teamMap, teamByCodeMap, playerToTeamMap);
      const playerObj = pDoc ? { _id: pDoc._id, name: pDoc.name, country: pDoc.country, nationalTeamId: pDoc.nationalTeamId, iplTeamId: pDoc.iplTeamId } : { _id: item.playerId || item._id, name: item.playerName || 'Player' };
      return {
        ...item.toObject ? item.toObject() : item,
        playerId: playerObj,
        playerProfileId: playerObj._id,
        team: teamInfo
      };
    });

    res.json({
      success: true,
      data: {
        division,
        topBatsmen,
        topBowlers,
        topMvps
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCricketRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    const division = ((req.query.division as string) || 'all').toLowerCase();
    const userId = (req as any).user?._id;

    const { Team } = await import('../models/Team');
    const { PlayerMatchStats } = await import('../models/PlayerMatchStats');
    const { Player } = await import('../models/Player');
    const { CareerStats } = await import('../models/CareerStats');
    const { Match } = await import('../models/Match');

    // Load Teams
    const userTeamFilter: any = userId ? { createdBy: userId } : {};
    const allTeams = await Team.find(userTeamFilter).lean();
    const teamMap = new Map(allTeams.map(t => [t._id.toString(), t]));
    const teamByCodeMap = new Map<string, any>(allTeams.filter(t => !!t.teamId).map(t => [t.teamId as string, t]));
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

    // Load Players
    const userPlayerFilter: any = userId ? { createdBy: userId } : {};
    const userPlayers = await Player.find(userPlayerFilter).select('_id name fullName country nationalTeamId iplTeamId').lean();
    const userPlayerMap = new Map(userPlayers.map(p => [p._id.toString(), p]));
    const userPlayerIds = userPlayers.map(p => p._id);

    // Division filter on teams
    let matchingTeamIds: any[] = [];
    if (division === 'international') {
      matchingTeamIds = allTeams.filter(t => t.teamId === 'INT_IND' || (t.name && /^india$/i.test(t.name))).map(t => t._id);
    } else if (division === 'ipl') {
      matchingTeamIds = allTeams.filter(t => (t.league && /^IPL$/i.test(t.league)) || t.teamType === 'franchise' || (t.teamId && /^IPL_/i.test(t.teamId))).map(t => t._id);
    } else {
      matchingTeamIds = allTeams.map(t => t._id);
    }

    const matchStatsFilter: any = {};
    if (userId && userPlayerIds.length > 0) {
      matchStatsFilter.playerId = { $in: userPlayerIds };
    }
    if (division !== 'all' && matchingTeamIds.length > 0) {
      matchStatsFilter.teamId = { $in: matchingTeamIds };
    }

    const formatPlayerDisplay = (pDoc: any, fallbackName?: string) => {
      const name = pDoc?.name || fallbackName || 'Player';
      const fullName = pDoc?.fullName || name;
      return {
        _id: pDoc?._id || null,
        name,
        fullName
      };
    };

    const resolveMatchOpponent = (matchDoc: any, playerTeamId: any) => {
      if (!matchDoc) return null;
      const teamAId = matchDoc.teamA?._id?.toString() || matchDoc.teamA?.toString();
      const teamBId = matchDoc.teamB?._id?.toString() || matchDoc.teamB?.toString();
      const pTeamIdStr = playerTeamId?.toString();

      const oppId = pTeamIdStr === teamAId ? teamBId : teamAId;
      if (oppId && teamMap.has(oppId)) {
        return formatTeamInfo(teamMap.get(oppId));
      }
      return null;
    };

    // ==========================================
    // 1. INDIVIDUAL BATTING RECORDS (INNINGS)
    // ==========================================
    const battingRecords: any[] = [];

    // 1.1 Highest Individual Score
    const highestScoreDoc = await PlayerMatchStats.findOne({
      ...matchStatsFilter,
      'batting.runs': { $gt: 0 }
    })
      .sort({ 'batting.runs': -1, 'batting.balls': 1 })
      .populate('matchId')
      .populate('playerId')
      .lean();

    if (highestScoreDoc) {
      const pDoc = userPlayerMap.get(highestScoreDoc.playerId?._id?.toString()) || highestScoreDoc.playerId;
      const teamInfo = resolvePlayerTeam(pDoc, division, highestScoreDoc.teamId, teamMap, teamByCodeMap, playerToTeamMap);
      const oppInfo = resolveMatchOpponent(highestScoreDoc.matchId, highestScoreDoc.teamId);
      const isNotOut = ['not_out', 'not out'].includes((highestScoreDoc.batting?.outStatus || '').toLowerCase());
      const bRuns = highestScoreDoc.batting?.runs || 0;
      const bBalls = highestScoreDoc.batting?.balls || 0;
      const b4s = highestScoreDoc.batting?.fours || 0;
      const b6s = highestScoreDoc.batting?.sixes || 0;
      const bSR = bBalls > 0 ? ((bRuns / bBalls) * 100).toFixed(1) : '0.0';

      battingRecords.push({
        id: 'highest_score',
        title: 'Highest Individual Score',
        category: 'Inning Knockout',
        badge: '👑 ALL-TIME BEST',
        statValue: `${bRuns}${isNotOut ? '*' : ''} Runs`,
        statLabel: `${bBalls} Balls Faced`,
        player: formatPlayerDisplay(pDoc, highestScoreDoc.playerName),
        team: teamInfo,
        opponent: oppInfo,
        details: `${b4s} Fours · ${b6s} Sixes · SR ${bSR}`,
        date: (highestScoreDoc.matchId as any)?.date || highestScoreDoc.createdAt
      });
    }

    // 1.2 Fastest 50
    const fastestFiftyDoc = await PlayerMatchStats.findOne({
      ...matchStatsFilter,
      'batting.fastestFiftyBalls': { $gt: 0 }
    })
      .sort({ 'batting.fastestFiftyBalls': 1, 'batting.runs': -1 })
      .populate('matchId')
      .populate('playerId')
      .lean();

    if (fastestFiftyDoc) {
      const pDoc = userPlayerMap.get(fastestFiftyDoc.playerId?._id?.toString()) || fastestFiftyDoc.playerId;
      const teamInfo = resolvePlayerTeam(pDoc, division, fastestFiftyDoc.teamId, teamMap, teamByCodeMap, playerToTeamMap);
      const oppInfo = resolveMatchOpponent(fastestFiftyDoc.matchId, fastestFiftyDoc.teamId);
      const bBalls = fastestFiftyDoc.batting?.fastestFiftyBalls;
      const totalRuns = fastestFiftyDoc.batting?.runs || 50;

      battingRecords.push({
        id: 'fastest_fifty',
        title: 'Fastest Half-Century (50)',
        category: 'Milestone Blitz',
        badge: '⚡ LIGHTNING',
        statValue: `${bBalls} Balls`,
        statLabel: 'Reached 50 in',
        player: formatPlayerDisplay(pDoc, fastestFiftyDoc.playerName),
        team: teamInfo,
        opponent: oppInfo,
        details: `${totalRuns} runs in match knock`,
        date: (fastestFiftyDoc.matchId as any)?.date || fastestFiftyDoc.createdAt
      });
    }

    // 1.3 Fastest 100
    const fastestHundredDoc = await PlayerMatchStats.findOne({
      ...matchStatsFilter,
      'batting.fastestHundredBalls': { $gt: 0 }
    })
      .sort({ 'batting.fastestHundredBalls': 1, 'batting.runs': -1 })
      .populate('matchId')
      .populate('playerId')
      .lean();

    if (fastestHundredDoc) {
      const pDoc = userPlayerMap.get(fastestHundredDoc.playerId?._id?.toString()) || fastestHundredDoc.playerId;
      const teamInfo = resolvePlayerTeam(pDoc, division, fastestHundredDoc.teamId, teamMap, teamByCodeMap, playerToTeamMap);
      const oppInfo = resolveMatchOpponent(fastestHundredDoc.matchId, fastestHundredDoc.teamId);
      const bBalls = fastestHundredDoc.batting?.fastestHundredBalls;
      const totalRuns = fastestHundredDoc.batting?.runs || 100;

      battingRecords.push({
        id: 'fastest_hundred',
        title: 'Fastest Century (100)',
        category: 'Milestone Blitz',
        badge: '🚀 CENTURY BLITZ',
        statValue: `${bBalls} Balls`,
        statLabel: 'Reached 100 in',
        player: formatPlayerDisplay(pDoc, fastestHundredDoc.playerName),
        team: teamInfo,
        opponent: oppInfo,
        details: `${totalRuns} total runs in knock`,
        date: (fastestHundredDoc.matchId as any)?.date || fastestHundredDoc.createdAt
      });
    }

    // 1.4 Most Sixes in an Inning
    const mostSixesDoc = await PlayerMatchStats.findOne({
      ...matchStatsFilter,
      'batting.sixes': { $gt: 0 }
    })
      .sort({ 'batting.sixes': -1, 'batting.runs': -1 })
      .populate('matchId')
      .populate('playerId')
      .lean();

    if (mostSixesDoc) {
      const pDoc = userPlayerMap.get(mostSixesDoc.playerId?._id?.toString()) || mostSixesDoc.playerId;
      const teamInfo = resolvePlayerTeam(pDoc, division, mostSixesDoc.teamId, teamMap, teamByCodeMap, playerToTeamMap);
      const oppInfo = resolveMatchOpponent(mostSixesDoc.matchId, mostSixesDoc.teamId);
      const sixes = mostSixesDoc.batting?.sixes || 0;
      const runs = mostSixesDoc.batting?.runs || 0;

      battingRecords.push({
        id: 'most_sixes_inning',
        title: 'Most Sixes in an Inning',
        category: 'Power Hitting',
        badge: '💥 MAXIMUMS',
        statValue: `${sixes} Sixes`,
        statLabel: `${sixes * 6} Runs from Sixes alone`,
        player: formatPlayerDisplay(pDoc, mostSixesDoc.playerName),
        team: teamInfo,
        opponent: oppInfo,
        details: `${runs} runs scored in total`,
        date: (mostSixesDoc.matchId as any)?.date || mostSixesDoc.createdAt
      });
    }

    // 1.5 Most Fours in an Inning
    const mostFoursDoc = await PlayerMatchStats.findOne({
      ...matchStatsFilter,
      'batting.fours': { $gt: 0 }
    })
      .sort({ 'batting.fours': -1, 'batting.runs': -1 })
      .populate('matchId')
      .populate('playerId')
      .lean();

    if (mostFoursDoc) {
      const pDoc = userPlayerMap.get(mostFoursDoc.playerId?._id?.toString()) || mostFoursDoc.playerId;
      const teamInfo = resolvePlayerTeam(pDoc, division, mostFoursDoc.teamId, teamMap, teamByCodeMap, playerToTeamMap);
      const oppInfo = resolveMatchOpponent(mostFoursDoc.matchId, mostFoursDoc.teamId);
      const fours = mostFoursDoc.batting?.fours || 0;
      const runs = mostFoursDoc.batting?.runs || 0;

      battingRecords.push({
        id: 'most_fours_inning',
        title: 'Most Fours in an Inning',
        category: 'Boundary Precision',
        badge: '🏏 BOUNDARIES',
        statValue: `${fours} Fours`,
        statLabel: `${fours * 4} Runs from Boundaries`,
        player: formatPlayerDisplay(pDoc, mostFoursDoc.playerName),
        team: teamInfo,
        opponent: oppInfo,
        details: `${runs} runs scored in total`,
        date: (mostFoursDoc.matchId as any)?.date || mostFoursDoc.createdAt
      });
    }

    // 1.6 Highest Inning Strike Rate (min 20 runs, min 5 balls)
    const highSRDocs = await PlayerMatchStats.find({
      ...matchStatsFilter,
      'batting.runs': { $gte: 20 },
      'batting.balls': { $gte: 5 }
    })
      .populate('matchId')
      .populate('playerId')
      .lean();

    let bestSRDoc: any = null;
    let maxSR = 0;
    for (const doc of highSRDocs) {
      const bRuns = doc.batting?.runs || 0;
      const bBalls = doc.batting?.balls || 0;
      if (bBalls > 0) {
        const sr = (bRuns / bBalls) * 100;
        if (sr > maxSR) {
          maxSR = sr;
          bestSRDoc = doc;
        }
      }
    }

    if (bestSRDoc) {
      const pDoc = userPlayerMap.get(bestSRDoc.playerId?._id?.toString()) || bestSRDoc.playerId;
      const teamInfo = resolvePlayerTeam(pDoc, division, bestSRDoc.teamId, teamMap, teamByCodeMap, playerToTeamMap);
      const oppInfo = resolveMatchOpponent(bestSRDoc.matchId, bestSRDoc.teamId);
      const bRuns = bestSRDoc.batting?.runs || 0;
      const bBalls = bestSRDoc.batting?.balls || 0;

      battingRecords.push({
        id: 'highest_strike_rate',
        title: 'Highest Inning Strike Rate',
        category: 'Firepower Knock',
        badge: '🔥 FIREPOWER',
        statValue: `${maxSR.toFixed(1)} SR`,
        statLabel: `${bRuns} Runs off ${bBalls} Balls`,
        player: formatPlayerDisplay(pDoc, bestSRDoc.playerName),
        team: teamInfo,
        opponent: oppInfo,
        details: `Min 20 runs scored in match`,
        date: (bestSRDoc.matchId as any)?.date || bestSRDoc.createdAt
      });
    }

    // 1.7 Career Leading Run Scorer
    const careerRunLeader = await CareerStats.findOne({
      ...(userPlayerIds.length > 0 ? { playerId: { $in: userPlayerIds } } : {}),
      'batting.runs': { $gt: 0 }
    })
      .sort({ 'batting.runs': -1 })
      .populate('playerId')
      .lean();

    if (careerRunLeader) {
      const pDoc = careerRunLeader.playerId;
      const teamInfo = resolvePlayerTeam(pDoc, division, null, teamMap, teamByCodeMap, playerToTeamMap);
      const cRuns = careerRunLeader.batting?.runs || 0;
      const cMatches = careerRunLeader.batting?.matches || 0;
      const c100s = careerRunLeader.batting?.hundreds || 0;
      const c50s = careerRunLeader.batting?.fifties || 0;

      battingRecords.push({
        id: 'career_runs_leader',
        title: 'All-Time Leading Run Scorer',
        category: 'Career Hall of Fame',
        badge: '🏆 LEGEND',
        statValue: `${cRuns.toLocaleString()} Runs`,
        statLabel: `In ${cMatches} Matches`,
        player: formatPlayerDisplay(pDoc, (careerRunLeader as any).playerName),
        team: teamInfo,
        opponent: null,
        details: `${c100s}x 100s · ${c50s}x 50s registered`,
        date: null
      });
    }

    // 1.8 Most Career Centuries
    const most100sDoc = await CareerStats.findOne({
      ...(userPlayerIds.length > 0 ? { playerId: { $in: userPlayerIds } } : {}),
      'batting.hundreds': { $gt: 0 }
    })
      .sort({ 'batting.hundreds': -1, 'batting.runs': -1 })
      .populate('playerId')
      .lean();

    if (most100sDoc) {
      const pDoc = most100sDoc.playerId;
      const teamInfo = resolvePlayerTeam(pDoc, division, null, teamMap, teamByCodeMap, playerToTeamMap);
      const c100s = most100sDoc.batting?.hundreds || 0;
      const cRuns = most100sDoc.batting?.runs || 0;

      battingRecords.push({
        id: 'career_most_hundreds',
        title: 'Most Career Centuries (100s)',
        category: 'Career Milestone',
        badge: '💯 TON MASTER',
        statValue: `${c100s} Century${c100s > 1 ? 's' : ''}`,
        statLabel: `${cRuns} Career Runs`,
        player: formatPlayerDisplay(pDoc, (most100sDoc as any).playerName),
        team: teamInfo,
        opponent: null,
        details: `Most tons scored in competition`,
        date: null
      });
    }

    // ==========================================
    // 2. INDIVIDUAL BOWLING RECORDS
    // ==========================================
    const bowlingRecords: any[] = [];

    // 2.1 Best Bowling Figures in a Match
    const bestBowlingDoc = await PlayerMatchStats.findOne({
      ...matchStatsFilter,
      'bowling.wickets': { $gt: 0 }
    })
      .sort({ 'bowling.wickets': -1, 'bowling.runsConceded': 1 })
      .populate('matchId')
      .populate('playerId')
      .lean();

    if (bestBowlingDoc) {
      const pDoc = userPlayerMap.get(bestBowlingDoc.playerId?._id?.toString()) || bestBowlingDoc.playerId;
      const teamInfo = resolvePlayerTeam(pDoc, division, bestBowlingDoc.teamId, teamMap, teamByCodeMap, playerToTeamMap);
      const oppInfo = resolveMatchOpponent(bestBowlingDoc.matchId, bestBowlingDoc.teamId);
      const wkts = bestBowlingDoc.bowling?.wickets || 0;
      const rCon = bestBowlingDoc.bowling?.runsConceded || 0;
      const overs = bestBowlingDoc.bowling?.overs || 0;
      const maidens = bestBowlingDoc.bowling?.maidens || 0;
      const econ = overs > 0 ? (rCon / overs).toFixed(2) : '0.00';

      bowlingRecords.push({
        id: 'best_bowling_figures',
        title: 'Best Bowling Figures in a Match',
        category: 'Match Spell',
        badge: '🎯 LETHAL SPELL',
        statValue: `${wkts}/${rCon}`,
        statLabel: `in ${overs} Overs`,
        player: formatPlayerDisplay(pDoc, bestBowlingDoc.playerName),
        team: teamInfo,
        opponent: oppInfo,
        details: `${maidens} Maiden(s) · Econ ${econ}`,
        date: (bestBowlingDoc.matchId as any)?.date || bestBowlingDoc.createdAt
      });
    }

    // 2.2 Most Maidens in a Match
    const mostMaidensDoc = await PlayerMatchStats.findOne({
      ...matchStatsFilter,
      'bowling.maidens': { $gt: 0 }
    })
      .sort({ 'bowling.maidens': -1, 'bowling.wickets': -1 })
      .populate('matchId')
      .populate('playerId')
      .lean();

    if (mostMaidensDoc) {
      const pDoc = userPlayerMap.get(mostMaidensDoc.playerId?._id?.toString()) || mostMaidensDoc.playerId;
      const teamInfo = resolvePlayerTeam(pDoc, division, mostMaidensDoc.teamId, teamMap, teamByCodeMap, playerToTeamMap);
      const oppInfo = resolveMatchOpponent(mostMaidensDoc.matchId, mostMaidensDoc.teamId);
      const maidens = mostMaidensDoc.bowling?.maidens || 0;
      const wkts = mostMaidensDoc.bowling?.wickets || 0;
      const rCon = mostMaidensDoc.bowling?.runsConceded || 0;
      const overs = mostMaidensDoc.bowling?.overs || 0;

      bowlingRecords.push({
        id: 'most_maidens_match',
        title: 'Most Maidens in a Match',
        category: 'Bowling Control',
        badge: '🧱 THE WALL',
        statValue: `${maidens} Maiden${maidens > 1 ? 's' : ''}`,
        statLabel: `${overs} Overs Bowled`,
        player: formatPlayerDisplay(pDoc, mostMaidensDoc.playerName),
        team: teamInfo,
        opponent: oppInfo,
        details: `${wkts}/${rCon} figures`,
        date: (mostMaidensDoc.matchId as any)?.date || mostMaidensDoc.createdAt
      });
    }

    // 2.3 Career Leading Wicket Taker
    const careerWicketLeader = await CareerStats.findOne({
      ...(userPlayerIds.length > 0 ? { playerId: { $in: userPlayerIds } } : {}),
      'bowling.wickets': { $gt: 0 }
    })
      .sort({ 'bowling.wickets': -1, 'bowling.runsConceded': 1 })
      .populate('playerId')
      .lean();

    if (careerWicketLeader) {
      const pDoc = careerWicketLeader.playerId;
      const teamInfo = resolvePlayerTeam(pDoc, division, null, teamMap, teamByCodeMap, playerToTeamMap);
      const cWkts = careerWicketLeader.bowling?.wickets || 0;
      const cOvers = careerWicketLeader.bowling?.overs || 0;
      const cRunsCon = careerWicketLeader.bowling?.runsConceded || 0;
      const cEcon = cOvers > 0 ? (cRunsCon / cOvers).toFixed(2) : '0.00';

      bowlingRecords.push({
        id: 'career_wickets_leader',
        title: 'All-Time Leading Wicket Taker',
        category: 'Career Hall of Fame',
        badge: '🌪️ WICKET HUNTER',
        statValue: `${cWkts} Wickets`,
        statLabel: `in ${cOvers} Overs`,
        player: formatPlayerDisplay(pDoc, (careerWicketLeader as any).playerName),
        team: teamInfo,
        opponent: null,
        details: `Economy: ${cEcon} · Conceded ${cRunsCon} runs`,
        date: null
      });
    }

    // 2.4 Best Career Economy Rate (min 6 overs)
    const econDocs = await CareerStats.find({
      ...(userPlayerIds.length > 0 ? { playerId: { $in: userPlayerIds } } : {}),
      'bowling.overs': { $gte: 6 }
    })
      .populate('playerId')
      .lean();

    let bestEconDoc: any = null;
    let minEcon = 999999;
    for (const c of econDocs) {
      const overs = c.bowling?.overs || 0;
      const runs = c.bowling?.runsConceded || 0;
      if (overs >= 6) {
        const econ = runs / overs;
        if (econ < minEcon) {
          minEcon = econ;
          bestEconDoc = c;
        }
      }
    }

    if (bestEconDoc) {
      const pDoc = bestEconDoc.playerId;
      const teamInfo = resolvePlayerTeam(pDoc, division, null, teamMap, teamByCodeMap, playerToTeamMap);
      const overs = bestEconDoc.bowling?.overs || 0;
      const runs = bestEconDoc.bowling?.runsConceded || 0;
      const wkts = bestEconDoc.bowling?.wickets || 0;

      bowlingRecords.push({
        id: 'best_career_economy',
        title: 'Best Career Economy Rate',
        category: 'Economy Maestro',
        badge: '🔒 TIGHT SPELL',
        statValue: `${minEcon.toFixed(2)} Econ`,
        statLabel: `Min 6 Overs Bowled`,
        player: formatPlayerDisplay(pDoc, (bestEconDoc as any).playerName),
        team: teamInfo,
        opponent: null,
        details: `${wkts} wickets taken · ${runs} runs conceded in ${overs} ov`,
        date: null
      });
    }

    // ==========================================
    // 3. TEAM & MATCH MILESTONES
    // ==========================================
    const teamRecords: any[] = [];

    // Query matches for team records
    const matchFilter: any = {};
    if (userId) matchFilter.createdBy = userId;
    if (division !== 'all' && matchingTeamIds.length > 0) {
      matchFilter.$or = [
        { teamA: { $in: matchingTeamIds } },
        { teamB: { $in: matchingTeamIds } }
      ];
    }

    const allMatches = await Match.find(matchFilter)
      .populate('teamA')
      .populate('teamB')
      .populate('mvp')
      .sort({ date: -1 })
      .lean();

    // 3.1 Highest Team Total
    let highestTotalMatch: any = null;
    let highestTotalScore = 0;
    let highestTotalTeam: any = null;
    let highestTotalOpponent: any = null;
    let highestTotalWickets = 0;
    let highestTotalOvers = 0;

    for (const m of allMatches) {
      const aRuns = Number(m.teamAScore?.runs) || 0;
      const bRuns = Number(m.teamBScore?.runs) || 0;

      if (aRuns > highestTotalScore) {
        highestTotalScore = aRuns;
        highestTotalMatch = m;
        highestTotalTeam = formatTeamInfo(m.teamA);
        highestTotalOpponent = formatTeamInfo(m.teamB);
        highestTotalWickets = Number(m.teamAScore?.wickets) || 0;
        highestTotalOvers = Number(m.teamAScore?.overs) || m.overs || 20;
      }
      if (bRuns > highestTotalScore) {
        highestTotalScore = bRuns;
        highestTotalMatch = m;
        highestTotalTeam = formatTeamInfo(m.teamB);
        highestTotalOpponent = formatTeamInfo(m.teamA);
        highestTotalWickets = Number(m.teamBScore?.wickets) || 0;
        highestTotalOvers = Number(m.teamBScore?.overs) || m.overs || 20;
      }
    }

    if (highestTotalMatch && highestTotalScore > 0) {
      const rpo = highestTotalOvers > 0 ? (highestTotalScore / highestTotalOvers).toFixed(2) : '0.00';
      teamRecords.push({
        id: 'highest_team_total',
        title: 'Highest Team Total',
        category: 'Team Dominance',
        badge: '🏰 GARGANTUAN',
        statValue: `${highestTotalScore}/${highestTotalWickets}`,
        statLabel: `in ${highestTotalOvers} Overs`,
        team: highestTotalTeam,
        opponent: highestTotalOpponent,
        details: `Run Rate: ${rpo} RPO · ${highestTotalMatch.result || 'Match Completed'}`,
        date: highestTotalMatch.date || highestTotalMatch.createdAt
      });
    }

    // 3.2 Biggest Margin of Victory (by Runs)
    let maxRunMargin = 0;
    let maxRunMarginMatch: any = null;
    let maxRunMarginTeam: any = null;
    let maxRunMarginOpp: any = null;

    // 3.3 Biggest Margin of Victory (by Wickets)
    let maxWktMargin = 0;
    let maxWktMarginMatch: any = null;
    let maxWktMarginTeam: any = null;
    let maxWktMarginOpp: any = null;

    for (const m of allMatches) {
      const resStr = (m.result || '').toLowerCase();
      // Runs match
      const runMatch = resStr.match(/won\s+by\s+(\d+)\s+runs?/i);
      if (runMatch && runMatch[1]) {
        const margin = parseInt(runMatch[1], 10);
        if (margin > maxRunMargin) {
          maxRunMargin = margin;
          maxRunMarginMatch = m;
          const aRuns = Number(m.teamAScore?.runs) || 0;
          const bRuns = Number(m.teamBScore?.runs) || 0;
          if (aRuns > bRuns) {
            maxRunMarginTeam = formatTeamInfo(m.teamA);
            maxRunMarginOpp = formatTeamInfo(m.teamB);
          } else {
            maxRunMarginTeam = formatTeamInfo(m.teamB);
            maxRunMarginOpp = formatTeamInfo(m.teamA);
          }
        }
      }

      // Wickets match
      const wktMatch = resStr.match(/won\s+by\s+(\d+)\s+wickets?/i);
      if (wktMatch && wktMatch[1]) {
        const margin = parseInt(wktMatch[1], 10);
        if (margin > maxWktMargin) {
          maxWktMargin = margin;
          maxWktMarginMatch = m;
          const aWkts = Number(m.teamAScore?.wickets) || 0;
          const bWkts = Number(m.teamBScore?.wickets) || 0;
          // usually the team that lost fewer wickets won
          if (aWkts < bWkts) {
            maxRunMarginTeam = formatTeamInfo(m.teamA);
            maxRunMarginOpp = formatTeamInfo(m.teamB);
          } else {
            maxWktMarginTeam = formatTeamInfo(m.teamB);
            maxWktMarginOpp = formatTeamInfo(m.teamA);
          }
        }
      }
    }

    if (maxRunMarginMatch && maxRunMargin > 0) {
      teamRecords.push({
        id: 'biggest_win_runs',
        title: 'Biggest Victory (by Runs)',
        category: 'Crushing Margin',
        badge: '🏆 CRUSHING WIN',
        statValue: `Won by ${maxRunMargin} Runs`,
        statLabel: 'Run Difference',
        team: maxRunMarginTeam,
        opponent: maxRunMarginOpp,
        details: maxRunMarginMatch.result,
        date: maxRunMarginMatch.date || maxRunMarginMatch.createdAt
      });
    }

    if (maxWktMarginMatch && maxWktMargin > 0) {
      teamRecords.push({
        id: 'biggest_win_wickets',
        title: 'Biggest Victory (by Wickets)',
        category: 'Clinical Chase',
        badge: '🏹 CLINICAL CHASE',
        statValue: `Won by ${maxWktMargin} Wickets`,
        statLabel: 'Wicket Margin',
        team: maxWktMarginTeam,
        opponent: maxWktMarginOpp,
        details: maxWktMarginMatch.result,
        date: maxWktMarginMatch.date || maxWktMarginMatch.createdAt
      });
    }

    // 3.4 Most MVPs (Player of the Match)
    const mostMvpsCareerDoc = await CareerStats.findOne({
      ...(userPlayerIds.length > 0 ? { playerId: { $in: userPlayerIds } } : {}),
      mvps: { $gt: 0 }
    })
      .sort({ mvps: -1, 'batting.runs': -1 })
      .populate('playerId')
      .lean();

    if (mostMvpsCareerDoc) {
      const pDoc = mostMvpsCareerDoc.playerId;
      const teamInfo = resolvePlayerTeam(pDoc, division, null, teamMap, teamByCodeMap, playerToTeamMap);
      const totalMvps = mostMvpsCareerDoc.mvps || 0;

      teamRecords.push({
        id: 'most_mvp_awards',
        title: 'Most Player of the Match Awards',
        category: 'Hall of Fame MVP',
        badge: '⭐ GOLDEN MVP',
        statValue: `${totalMvps} MVPs Won`,
        statLabel: 'Match Awards',
        player: formatPlayerDisplay(pDoc, (mostMvpsCareerDoc as any).playerName),
        team: teamInfo,
        opponent: null,
        details: `Most decisive match winner in history`,
        date: null
      });
    }

    res.json({
      success: true,
      data: {
        division,
        batting: battingRecords,
        bowling: bowlingRecords,
        team: teamRecords
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

