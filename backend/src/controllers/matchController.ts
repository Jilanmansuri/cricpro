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

export const uploadScorecard = async (req: Request, res: Response): Promise<void> => {
  const fs = await import('fs');
  const imagePath = req.file?.path;

  try {
    if (!req.file || !imagePath) {
      res.status(400).json({ success: false, message: 'Please upload a scorecard image' });
      return;
    }

    const { GeminiExtractionService } = await import('../services/GeminiExtractionService');
    const { ScorecardValidationService } = await import('../services/ScorecardValidationService');
    const { OcrService } = await import('../services/OcrService');
    const { ParserService } = await import('../services/ParserService');

    const geminiService = new GeminiExtractionService();
    const validationService = new ScorecardValidationService();

    let extractedScorecard: any = null;
    let extractionEngine = 'gemini-vision';
    let rawText = '';
    let ocrConfidence = 0.95;

    if (geminiService.isAvailable()) {
      try {
        console.log('[ScorecardScan] Attempting Gemini Vision extraction...');
        extractedScorecard = await geminiService.extractScorecardFromImage(imagePath);
      } catch (geminiError: any) {
        console.warn('[ScorecardScan] Gemini extraction failed, falling back to local OCR:', geminiError.message);
      }
    }

    // Fallback to local OCR if Gemini is unavailable or failed
    if (!extractedScorecard) {
      extractionEngine = 'tesseract-ocr';
      console.log('[ScorecardScan] Running local Sharp + Tesseract OCR...');
      const ocrService = new OcrService();
      const parserService = new ParserService();

      const ocrResult = await ocrService.processAndExtractText(imagePath);
      rawText = ocrResult.text;
      ocrConfidence = ocrResult.confidence;
      const parsedData = parserService.parseScorecardText(ocrResult.text);

      // Adapt parser output to structured innings format
      extractedScorecard = {
        match: {
          teams: [parsedData.matchInfo.teamA, parsedData.matchInfo.teamB],
          teamA: parsedData.matchInfo.teamA,
          teamB: parsedData.matchInfo.teamB,
          date: parsedData.matchInfo.date,
          venue: parsedData.matchInfo.venue,
          competition: null,
          format: 'T20',
          matchType: 'T20',
          overs: parsedData.matchInfo.overs,
          result: {
            winner: null,
            text: parsedData.matchInfo.result,
            margin: null
          },
          playerOfMatch: parsedData.matchInfo.mvp
        },
        innings: [
          {
            inningsNumber: 1,
            battingTeam: parsedData.matchInfo.teamA,
            bowlingTeam: parsedData.matchInfo.teamB,
            total: parsedData.matchInfo.teamAScore,
            batters: parsedData.teamABatting.map(b => ({
              ...b,
              dismissalStatus: b.outStatus
            })),
            bowlers: parsedData.teamBBowling,
            extras: { total: 0 }
          },
          {
            inningsNumber: 2,
            battingTeam: parsedData.matchInfo.teamB,
            bowlingTeam: parsedData.matchInfo.teamA,
            total: parsedData.matchInfo.teamBScore,
            batters: parsedData.teamBBatting.map(b => ({
              ...b,
              dismissalStatus: b.outStatus
            })),
            bowlers: parsedData.teamABowling,
            extras: { total: 0 }
          }
        ]
      };
    }

    // Clean up temporary uploaded file
    if (imagePath && fs.existsSync(imagePath)) {
      try {
        fs.unlinkSync(imagePath);
      } catch (err) {
        console.error('Failed to cleanup temp upload file:', err);
      }
    }

    // Run Scorecard Validation
    const validationResult = validationService.validateScorecard(extractedScorecard);

    // Resolve Teams against Team Master
    const { TeamMatchingService } = await import('../services/TeamMatchingService');
    const teamMatchingService = new TeamMatchingService();

    const teamAResolution = await teamMatchingService.resolveTeamMaster(
      extractedScorecard.match.teamA,
      { league: extractedScorecard.match.competition || extractedScorecard.match.format }
    );
    const teamBResolution = await teamMatchingService.resolveTeamMaster(
      extractedScorecard.match.teamB,
      { league: extractedScorecard.match.competition || extractedScorecard.match.format }
    );

    // Normalize for both frontend and backend consumption
    const inn1 = extractedScorecard.innings?.[0] || {};
    const inn2 = extractedScorecard.innings?.[1] || {};

    const resolvedTeamAName = teamAResolution.team
      ? (teamAResolution.team.displayName || teamAResolution.team.officialName || teamAResolution.team.name)
      : extractedScorecard.match.teamA;

    const resolvedTeamBName = teamBResolution.team
      ? (teamBResolution.team.displayName || teamBResolution.team.officialName || teamBResolution.team.name)
      : extractedScorecard.match.teamB;

    const responsePayload = {
      extractionEngine,
      ocrConfidence: extractionEngine === 'gemini-vision' ? validationResult.scorecardConfidence : ocrConfidence,
      rawText,
      validation: validationResult,
      match: extractedScorecard.match,
      teamAResolution: {
        resolved: teamAResolution.resolved,
        confidence: teamAResolution.confidence,
        needsReview: teamAResolution.needsReview,
        teamId: teamAResolution.team?.teamId,
        id: teamAResolution.team?._id,
        candidates: teamAResolution.candidates.map(c => ({
          id: c.team._id,
          teamId: c.team.teamId,
          name: c.team.displayName || c.team.officialName || c.team.name,
          confidence: c.confidence,
          matchReason: c.matchReason,
          logo: c.team.logoUrl || c.team.logo
        }))
      },
      teamBResolution: {
        resolved: teamBResolution.resolved,
        confidence: teamBResolution.confidence,
        needsReview: teamBResolution.needsReview,
        teamId: teamBResolution.team?.teamId,
        id: teamBResolution.team?._id,
        candidates: teamBResolution.candidates.map(c => ({
          id: c.team._id,
          teamId: c.team.teamId,
          name: c.team.displayName || c.team.officialName || c.team.name,
          confidence: c.confidence,
          matchReason: c.matchReason,
          logo: c.team.logoUrl || c.team.logo
        }))
      },
      matchInfo: {
        teamA: resolvedTeamAName,
        teamB: resolvedTeamBName,
        teamName: resolvedTeamAName,
        opponentTeam: resolvedTeamBName,
        teamAId: teamAResolution.team?._id?.toString(),
        teamBId: teamBResolution.team?._id?.toString(),
        teamAMasterId: teamAResolution.team?.teamId,
        teamBMasterId: teamBResolution.team?.teamId,
        teamALogo: teamAResolution.team?.logoUrl || teamAResolution.team?.logo || '',
        teamBLogo: teamBResolution.team?.logoUrl || teamBResolution.team?.logo || '',
        date: extractedScorecard.match.date,
        venue: extractedScorecard.match.venue,
        venueName: extractedScorecard.match.venue,
        overs: extractedScorecard.match.overs || 20,
        result: extractedScorecard.match.result?.text || '',
        mvp: extractedScorecard.match.playerOfMatch || '',
        teamAScore: inn1.total || { runs: 0, wickets: 0, overs: 0 },
        teamBScore: inn2.total || { runs: 0, wickets: 0, overs: 0 }
      },
      innings: extractedScorecard.innings,
      teamABatting: inn1.batters || [],
      teamBBowling: inn1.bowlers || [],
      teamBBatting: inn2.batters || [],
      teamABowling: inn2.bowlers || [],
      extrasA: inn1.extras || { total: 0 },
      extrasB: inn2.extras || { total: 0 }
    };

    res.json({
      success: true,
      message: `Scorecard processed successfully via ${extractionEngine}`,
      data: responsePayload
    });
  } catch (error: any) {
    if (imagePath && fs.existsSync(imagePath)) {
      try {
        fs.unlinkSync(imagePath);
      } catch (_) {}
    }
    console.error('Scorecard upload error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to process scorecard image' });
  }
};

export const exportScorecard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const format = (req.query.format as string) || 'csv';

    const match = await matchRepository.findById(id, ['teamA', 'teamB', 'venueId', 'mvp']);
    if (!match) {
      res.status(404).json({ success: false, message: 'Match not found' });
      return;
    }

    const playerStats = await playerMatchStatsRepository.find(
      { matchId: match._id },
      { populate: 'playerId' }
    );

    const { ExportHelper } = await import('../utils/ExportHelper');

    if (format === 'html') {
      const html = ExportHelper.exportMatchToHtml(match, playerStats);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="scorecard_${id}.html"`);
      res.send(html);
    } else {
      const csv = ExportHelper.exportMatchToCsv(match, playerStats);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="scorecard_${id}.csv"`);
      res.send(csv);
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default { getMatches, getMatchById, checkDuplicateMatch, uploadScorecard, exportScorecard };
