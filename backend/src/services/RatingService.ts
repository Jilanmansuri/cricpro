import { Types } from 'mongoose';
import { PlayerMatchStats } from '../models/PlayerMatchStats';
import { Match } from '../models/Match';
import { Player } from '../models/Player';
import { RATING_BENCHMARKS, FormatBenchmarks } from '../config/ratingBenchmarks';

export interface BattingRatingComponents {
  runScore: number;
  averageScore: number;
  strikeRateScore: number;
  consistencyScore: number;
}

export interface BowlerRatingComponents {
  wicketScore: number;
  economyScore: number;
  bowlingAverageScore: number;
  consistencyScore: number;
}

export interface TrendInfo {
  previousRank: number | null;
  change: number; // positive = climbed (e.g. +1), negative = dropped (e.g. -1), 0 = no change
  isNew: boolean;
}

export interface BatterRatingResult {
  playerId: string;
  playerName: string;
  rating: number | null;
  rawRating: number;
  isEligible: boolean;
  rank?: number;
  trend?: TrendInfo;
  components: BattingRatingComponents;
  stats: {
    matches: number;
    innings: number;
    runs: number;
    balls: number;
    notOuts: number;
    dismissals: number;
    average: number;
    strikeRate: number;
    runsPerMatch: number;
  };
}

export interface BowlerRatingResult {
  playerId: string;
  playerName: string;
  rating: number | null;
  rawRating: number;
  isEligible: boolean;
  rank?: number;
  trend?: TrendInfo;
  components: BowlerRatingComponents;
  stats: {
    matches: number;
    innings: number;
    overs: number;
    legalBalls: number;
    maidens: number;
    runsConceded: number;
    wickets: number;
    economy: number;
    average: number;
    wicketsPerMatch: number;
  };
}

export interface AllRounderRatingResult {
  playerId: string;
  playerName: string;
  rating: number | null;
  isEligible: boolean;
  rank?: number;
  trend?: TrendInfo;
  battingRating: number | null;
  bowlingRating: number | null;
  stats: {
    matches: number;
    runs: number;
    ballsFaced: number;
    wickets: number;
    legalBallsBowled: number;
    oversBowled: number;
    battingInnings: number;
  };
}

export interface PlayerReignStats {
  playerId: string;
  playerName: string;
  daysAtNo1: number;
  daysInTop3: number;
  longestReignDays: number;
  isCurrentlyNo1: boolean;
  currentNo1Categories: string[];
  breakdown: Array<{
    format: string;
    category: string;
    daysAtNo1: number;
    daysInTop3: number;
    isCurrentNo1: boolean;
  }>;
}

export interface RankingOptions {
  format?: 'T20' | 'ODI' | 'Test';
  category?: 'batters' | 'bowlers' | 'all-rounders' | 'all';
  scope?: 'career' | 'tournament';
  tournamentId?: string;
  userId?: string;
  limit?: number;
  asOfDate?: string | Date;
  startDate?: string | Date;
}

export class RatingService {
  /**
   * Clamps a value strictly between min and max (default 0 to 100)
   */
  public static clamp(val: number, min: number = 0, max: number = 100): number {
    if (isNaN(val) || val === null || val === undefined) return min;
    return Math.max(min, Math.min(max, val));
  }

  /**
   * Normalizes higher-is-better metrics to 0-100
   */
  public static normalizeLinear(value: number, minBench: number, maxBench: number): number {
    if (maxBench <= minBench) return 50;
    const score = ((value - minBench) / (maxBench - minBench)) * 100;
    return this.clamp(Math.round(score * 10) / 10);
  }

  /**
   * Normalizes lower-is-better metrics to 0-100 (e.g. Economy, Bowling Average)
   */
  public static normalizeInverted(value: number, bestMin: number, worstMax: number): number {
    if (worstMax <= bestMin) return 50;
    const score = ((worstMax - value) / (worstMax - bestMin)) * 100;
    return this.clamp(Math.round(score * 10) / 10);
  }

  /**
   * Converts cricket overs notation (e.g. 4.2 -> 4 overs and 2 balls) to INTEGER LEGAL BALLS.
   * Never treats 4.2 as decimal 4.2! (4 * 6 + 2 = 26 balls)
   */
  public static oversToLegalBalls(overs: number): number {
    if (!overs || isNaN(overs)) return 0;
    const fullOvers = Math.floor(overs);
    const remainderBalls = Math.round((overs - fullOvers) * 10);
    return (fullOvers * 6) + remainderBalls;
  }

  /**
   * Converts integer legal balls back to standard cricket overs notation (e.g. 26 balls -> 4.2 overs)
   */
  public static legalBallsToOvers(legalBalls: number): number {
    if (!legalBalls || legalBalls <= 0) return 0;
    const fullOvers = Math.floor(legalBalls / 6);
    const rem = legalBalls % 6;
    return fullOvers + (rem / 10);
  }

  /**
   * Determines match format using explicit format field first, with safe fallback.
   */
  public static detectMatchFormat(match: { format?: string; overs?: number }): 'T20' | 'ODI' | 'Test' {
    if (match.format && typeof match.format === 'string') {
      const clean = match.format.trim().toUpperCase();
      if (clean.includes('T20') || clean === 'TWENTY20') return 'T20';
      if (clean.includes('ODI') || clean.includes('50') || clean === 'ONE DAY') return 'ODI';
      if (clean.includes('TEST') || clean.includes('MULTI') || clean.includes('FIRST-CLASS')) return 'Test';
    }
    const overs = Number(match.overs) || 20;
    if (overs <= 20) return 'T20';
    if (overs <= 50) return 'ODI';
    return 'Test';
  }

  /**
   * Calculates robust consistency score (0 to 100) using variance and format benchmark targets.
   * Safe for small sample sizes, zero means, and zero standard deviations.
   */
  public static calculateConsistencyScore(scores: number[], targetGoodScore: number): number {
    if (!scores || scores.length === 0) return 50;
    if (scores.length === 1) {
      return scores[0] >= targetGoodScore ? 70 : 40;
    }

    const n = scores.length;
    const mean = scores.reduce((sum, s) => sum + s, 0) / n;
    
    // Calculate sample standard deviation
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Bounded coefficient of variation: lower variance relative to mean = higher consistency
    let cvScore = 50;
    if (mean > 0) {
      const cv = stdDev / mean;
      cvScore = this.clamp(Math.round((1 - Math.min(1.0, cv / 1.5)) * 100));
    } else {
      cvScore = 0;
    }

    // Benchmark achievement rate: proportion of innings meeting format good score
    const goodScoresCount = scores.filter(s => s >= targetGoodScore).length;
    const benchmarkScore = this.clamp(Math.round((goodScoresCount / n) * 100));

    // Blended consistency score (50% variation stability + 50% benchmark achievement)
    const blended = (0.50 * cvScore) + (0.50 * benchmarkScore);
    return this.clamp(Math.round(blended));
  }

  /**
   * Calculate Batter Rating (0 to 100)
   * Formula: 0.40 * runScore + 0.30 * averageScore + 0.20 * strikeRateScore + 0.10 * consistencyScore
   */
  public static calculateBatterRating(
    matchStats: Array<{
      batting: {
        didNotBat: boolean;
        runs: number;
        balls: number;
        outStatus: string;
      };
    }>,
    benchmarks: FormatBenchmarks['batting'],
    scope: 'career' | 'tournament' = 'career'
  ): {
    rating: number | null;
    rawRating: number;
    isEligible: boolean;
    components: BattingRatingComponents;
    stats: BatterRatingResult['stats'];
  } {
    const minMatches = scope === 'tournament' ? benchmarks.minMatchesTournament : benchmarks.minMatchesCareer;
    const minInnings = scope === 'tournament' ? benchmarks.minInningsTournament : benchmarks.minInningsCareer;
    const minBalls = scope === 'tournament' ? benchmarks.minBallsFacedTournament : benchmarks.minBallsFacedCareer;
    const confidenceMatches = scope === 'tournament' ? benchmarks.confidenceMatchesTournament : benchmarks.confidenceMatchesCareer;

    const matchesCount = matchStats.length;
    let totalRuns = 0;
    let totalBalls = 0;
    let inningsCount = 0;
    let notOutsCount = 0;
    const matchRunsList: number[] = [];

    for (const ms of matchStats) {
      if (!ms.batting.didNotBat) {
        inningsCount++;
        const r = Number(ms.batting.runs) || 0;
        const b = Number(ms.batting.balls) || 0;
        totalRuns += r;
        totalBalls += b;
        matchRunsList.push(r);

        const status = (ms.batting.outStatus || '').toLowerCase();
        if (status === 'not_out' || status.includes('not out')) {
          notOutsCount++;
        }
      }
    }

    const dismissals = Math.max(0, inningsCount - notOutsCount);
    const battingAvg = dismissals > 0 
      ? totalRuns / dismissals 
      : (inningsCount > 0 && totalRuns > 0 ? totalRuns : 0);

    const strikeRate = totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0;
    const runsPerMatch = matchesCount > 0 ? totalRuns / matchesCount : 0;

    // Component 1: Run production (runs per match)
    const runScore = this.normalizeLinear(runsPerMatch, benchmarks.minRunsPerMatch, benchmarks.maxRunsPerMatch);

    // Component 2: Batting average
    const averageScore = this.normalizeLinear(battingAvg, benchmarks.minAverage, benchmarks.maxAverage);

    // Component 3: Strike rate
    const strikeRateScore = this.normalizeLinear(strikeRate, benchmarks.minStrikeRate, benchmarks.maxStrikeRate);

    // Component 4: Consistency (robust & format-specific)
    const consistencyScore = this.calculateConsistencyScore(matchRunsList, benchmarks.goodScoreThreshold);

    // Weighted Formula
    const rawRating = (0.40 * runScore) + (0.30 * averageScore) + (0.20 * strikeRateScore) + (0.10 * consistencyScore);
    const roundedRaw = this.clamp(Math.round(rawRating * 10) / 10);

    // Strict Opportunities & Sample-Size Guard
    const isEligible = matchesCount >= minMatches && inningsCount >= minInnings && totalBalls >= minBalls;

    // Reliability Adjustment (Bayesian Damping towards 50.0 baseline)
    let finalRating: number | null = null;
    if (isEligible) {
      const reliabilityFactor = Math.min(1.0, matchesCount / confidenceMatches);
      const adjusted = (roundedRaw * reliabilityFactor) + (50.0 * (1 - reliabilityFactor));
      finalRating = this.clamp(Math.round(adjusted * 10) / 10);
    }

    return {
      rating: isEligible ? finalRating : null,
      rawRating: roundedRaw,
      isEligible,
      components: {
        runScore,
        averageScore,
        strikeRateScore,
        consistencyScore,
      },
      stats: {
        matches: matchesCount,
        innings: inningsCount,
        runs: totalRuns,
        balls: totalBalls,
        notOuts: notOutsCount,
        dismissals,
        average: Math.round(battingAvg * 100) / 100,
        strikeRate: Math.round(strikeRate * 10) / 10,
        runsPerMatch: Math.round(runsPerMatch * 10) / 10,
      },
    };
  }

  /**
   * Calculate Bowler Rating (0 to 100)
   * Formula: 0.45 * wicketScore + 0.30 * economyScore + 0.15 * bowlingAverageScore + 0.10 * consistencyScore
   * Stores and computes workload strictly in integer legal balls.
   */
  public static calculateBowlerRating(
    matchStats: Array<{
      bowling: {
        didNotBowl: boolean;
        overs: number;
        maidens: number;
        runsConceded: number;
        wickets: number;
      };
    }>,
    benchmarks: FormatBenchmarks['bowling'],
    scope: 'career' | 'tournament' = 'career'
  ): {
    rating: number | null;
    rawRating: number;
    isEligible: boolean;
    components: BowlerRatingComponents;
    stats: BowlerRatingResult['stats'];
  } {
    const minLegalBalls = scope === 'tournament' ? benchmarks.minLegalBallsTournament : benchmarks.minLegalBallsCareer;
    const minInnings = scope === 'tournament' ? benchmarks.minInningsTournament : benchmarks.minInningsCareer;
    const confidenceLegalBalls = scope === 'tournament' ? benchmarks.confidenceLegalBallsTournament : benchmarks.confidenceLegalBallsCareer;

    let matchesWithBowling = 0;
    let totalLegalBalls = 0;
    let totalRunsConceded = 0;
    let totalWickets = 0;
    let totalMaidens = 0;
    const matchWicketsList: number[] = [];

    for (const ms of matchStats) {
      if (!ms.bowling.didNotBowl) {
        const balls = this.oversToLegalBalls(ms.bowling.overs || 0);
        if (balls > 0 || (ms.bowling.wickets || 0) > 0) {
          matchesWithBowling++;
          totalLegalBalls += balls;
          totalRunsConceded += Number(ms.bowling.runsConceded) || 0;
          const w = Number(ms.bowling.wickets) || 0;
          totalWickets += w;
          totalMaidens += Number(ms.bowling.maidens) || 0;
          matchWicketsList.push(w);
        }
      }
    }

    const totalOvers = this.legalBallsToOvers(totalLegalBalls);
    const wicketsPerMatch = matchesWithBowling > 0 ? totalWickets / matchesWithBowling : 0;
    
    // Legal ball economy: (runs conceded / legal balls) * 6
    const economy = totalLegalBalls > 0 
      ? (totalRunsConceded / totalLegalBalls) * 6 
      : benchmarks.maxEconomy;

    // Bowling average: runs conceded / wickets
    const bowlingAvg = totalWickets > 0 
      ? totalRunsConceded / totalWickets 
      : benchmarks.maxAverage;

    // Component 1: Wickets per match
    const wicketScore = this.normalizeLinear(wicketsPerMatch, benchmarks.minWicketsPerMatch, benchmarks.maxWicketsPerMatch);

    // Component 2: Economy Performance (Inverted: lower is better)
    const economyScore = this.normalizeInverted(economy, benchmarks.minEconomy, benchmarks.maxEconomy);

    // Component 3: Bowling Average (Inverted: lower is better)
    const bowlingAverageScore = this.normalizeInverted(bowlingAvg, benchmarks.minAverage, benchmarks.maxAverage);

    // Component 4: Consistency (robust handling for few innings)
    const consistencyScore = this.calculateConsistencyScore(matchWicketsList, 1);

    // Weighted Formula
    const rawRating = (0.45 * wicketScore) + (0.30 * economyScore) + (0.15 * bowlingAverageScore) + (0.10 * consistencyScore);
    const roundedRaw = this.clamp(Math.round(rawRating * 10) / 10);

    // Strict Opportunities & Sample-Size Guard
    const isEligible = totalLegalBalls >= minLegalBalls && matchesWithBowling >= minInnings;

    // Reliability Adjustment (Bayesian Damping towards 50.0 baseline)
    let finalRating: number | null = null;
    if (isEligible) {
      const reliabilityFactor = Math.min(1.0, totalLegalBalls / confidenceLegalBalls);
      const adjusted = (roundedRaw * reliabilityFactor) + (50.0 * (1 - reliabilityFactor));
      finalRating = this.clamp(Math.round(adjusted * 10) / 10);
    }

    return {
      rating: isEligible ? finalRating : null,
      rawRating: roundedRaw,
      isEligible,
      components: {
        wicketScore,
        economyScore,
        bowlingAverageScore,
        consistencyScore,
      },
      stats: {
        matches: matchesWithBowling,
        innings: matchesWithBowling,
        overs: totalOvers,
        legalBalls: totalLegalBalls,
        maidens: totalMaidens,
        runsConceded: totalRunsConceded,
        wickets: totalWickets,
        economy: Math.round(economy * 100) / 100,
        average: Math.round(bowlingAvg * 100) / 100,
        wicketsPerMatch: Math.round(wicketsPerMatch * 100) / 100,
      },
    };
  }

  /**
   * Calculate All-Rounder Rating (0 to 100)
   * Formula: Math.sqrt(batterRating * bowlerRating)
   * Requires SUFFICIENT BATTING AND BOWLING OPPORTUNITIES, not merely appearances.
   */
  public static calculateAllRounderRating(
    batterResult: { rating: number | null; rawRating: number; isEligible: boolean; stats: { balls: number; innings: number } },
    bowlerResult: { rating: number | null; rawRating: number; isEligible: boolean; stats: { legalBalls: number; innings: number } },
    benchmarks: FormatBenchmarks['allRounder'],
    matchesCount: number,
    scope: 'career' | 'tournament' = 'career'
  ): {
    rating: number | null;
    isEligible: boolean;
  } {
    const minBatBalls = scope === 'tournament' ? benchmarks.minBattingBallsFacedTournament : benchmarks.minBattingBallsFacedCareer;
    const minBowlBalls = scope === 'tournament' ? benchmarks.minBowlingLegalBallsTournament : benchmarks.minBowlingLegalBallsCareer;
    const minMatches = scope === 'tournament' ? benchmarks.minMatchesTournament : benchmarks.minMatchesCareer;

    // Verify actual opportunities (balls faced and legal balls bowled)
    const hasSufficientBattingOpportunities = (batterResult.stats.balls || 0) >= minBatBalls && batterResult.stats.innings >= 1;
    const hasSufficientBowlingOpportunities = (bowlerResult.stats.legalBalls || 0) >= minBowlBalls && bowlerResult.stats.innings >= 1;
    const hasSufficientMatches = matchesCount >= minMatches;

    if (!hasSufficientBattingOpportunities || !hasSufficientBowlingOpportunities || !hasSufficientMatches) {
      return { rating: null, isEligible: false };
    }

    const bRating = batterResult.rating ?? batterResult.rawRating;
    const bwRating = bowlerResult.rating ?? bowlerResult.rawRating;

    if (bRating <= 0 || bwRating <= 0) {
      return { rating: 0, isEligible: true };
    }

    // Geometric mean of balanced performances
    const arRating = Math.sqrt(bRating * bwRating);
    return {
      rating: this.clamp(Math.round(arRating * 10) / 10),
      isEligible: true,
    };
  }

  /**
   * Helper to compute sorted player rankings for a specific set of match IDs
   */
  private async calculatePlayerRankingsForMatches(
    matchedMatchIds: Types.ObjectId[],
    format: 'T20' | 'ODI' | 'Test',
    scope: 'career' | 'tournament',
    limit: number
  ) {
    const benchmarks = RATING_BENCHMARKS[format];
    if (!benchmarks || matchedMatchIds.length === 0) {
      return { sortedBatters: [], sortedBowlers: [], sortedAllRounders: [] };
    }

    const statsList = await PlayerMatchStats.find({
      matchId: { $in: matchedMatchIds },
    }).lean();

    const playerStatsMap = new Map<string, any[]>();
    for (const stat of statsList) {
      const pId = stat.playerId ? stat.playerId.toString() : null;
      if (!pId) continue;
      if (!playerStatsMap.has(pId)) {
        playerStatsMap.set(pId, []);
      }
      playerStatsMap.get(pId)!.push(stat);
    }

    const uniquePlayerIds = Array.from(playerStatsMap.keys()).map(id => new Types.ObjectId(id));
    const players = await Player.find({ _id: { $in: uniquePlayerIds } }).lean();
    const playerMap = new Map(players.map(p => [p._id.toString(), p]));

    const batterResults: BatterRatingResult[] = [];
    const bowlerResults: BowlerRatingResult[] = [];
    const allRounderResults: AllRounderRatingResult[] = [];

    for (const [pId, pStats] of playerStatsMap.entries()) {
      const player = playerMap.get(pId);
      const playerName = player?.fullName || player?.name || pStats[0]?.playerName || 'Unknown Player';

      // Batting Rating
      const batCalc = RatingService.calculateBatterRating(pStats, benchmarks.batting, scope);
      batterResults.push({
        playerId: pId,
        playerName,
        rating: batCalc.rating,
        rawRating: batCalc.rawRating,
        isEligible: batCalc.isEligible,
        components: batCalc.components,
        stats: batCalc.stats,
      });

      // Bowling Rating
      const bowlCalc = RatingService.calculateBowlerRating(pStats, benchmarks.bowling, scope);
      bowlerResults.push({
        playerId: pId,
        playerName,
        rating: bowlCalc.rating,
        rawRating: bowlCalc.rawRating,
        isEligible: bowlCalc.isEligible,
        components: bowlCalc.components,
        stats: bowlCalc.stats,
      });

      // All-Rounder Rating
      const arCalc = RatingService.calculateAllRounderRating(
        batCalc,
        bowlCalc,
        benchmarks.allRounder,
        pStats.length,
        scope
      );
      allRounderResults.push({
        playerId: pId,
        playerName,
        rating: arCalc.rating,
        isEligible: arCalc.isEligible,
        battingRating: batCalc.rating,
        bowlingRating: bowlCalc.rating,
        stats: {
          matches: pStats.length,
          runs: batCalc.stats.runs,
          ballsFaced: batCalc.stats.balls,
          wickets: bowlCalc.stats.wickets,
          legalBallsBowled: bowlCalc.stats.legalBalls,
          oversBowled: bowlCalc.stats.overs,
          battingInnings: batCalc.stats.innings,
        },
      });
    }

    const sortedBatters = batterResults
      .filter(b => b.isEligible && b.rating !== null && b.rating > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, limit)
      .map((b, idx) => ({ ...b, rank: idx + 1 }));

    const sortedBowlers = bowlerResults
      .filter(b => b.isEligible && b.rating !== null && b.rating > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, limit)
      .map((b, idx) => ({ ...b, rank: idx + 1 }));

    const sortedAllRounders = allRounderResults
      .filter(ar => ar.isEligible && ar.rating !== null && ar.rating > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, limit)
      .map((ar, idx) => ({ ...ar, rank: idx + 1 }));

    return { sortedBatters, sortedBowlers, sortedAllRounders };
  }

  /**
   * Query and compute rankings across format, category, scope, and time
   */
  public async getRankings(options: RankingOptions = {}) {
    const format = options.format || 'T20';
    const category = options.category || 'all';
    const scope = options.scope || 'career';
    const tournamentId = options.tournamentId;
    const userId = options.userId;
    const limit = options.limit || 5;

    const benchmarks = RATING_BENCHMARKS[format];
    if (!benchmarks) {
      throw new Error(`Unsupported format: ${format}`);
    }

    // 1. Build Base Match query
    const matchQuery: any = {};
    if (userId) {
      matchQuery.createdBy = new Types.ObjectId(userId);
    }
    if (scope === 'tournament' && tournamentId) {
      matchQuery.tournamentId = new Types.ObjectId(tournamentId);
    }

    // Fetch all candidate matches in this scope
    const allMatches = await Match.find(matchQuery).select('_id overs format date createdAt').lean();

    // Format filtering using explicit format field first, with fallback to overs
    const formatMatches = allMatches.filter(m => {
      const detected = RatingService.detectMatchFormat({ format: m.format, overs: m.overs });
      return detected === format;
    });

    // Available match dates across all matches in this scope/format
    const availableMatchDates = Array.from(
      new Set(
        formatMatches
          .map(m => (m.date ? new Date(m.date).toISOString().split('T')[0] : null))
          .filter(Boolean) as string[]
      )
    ).sort().reverse();

    // Filter by date range / asOfDate if specified
    let filteredMatches = formatMatches;
    if (options.startDate) {
      const start = new Date(options.startDate);
      start.setHours(0, 0, 0, 0);
      filteredMatches = filteredMatches.filter(m => new Date(m.date || m.createdAt || 0) >= start);
    }
    if (options.asOfDate) {
      const end = new Date(options.asOfDate);
      end.setHours(23, 59, 59, 999);
      filteredMatches = filteredMatches.filter(m => new Date(m.date || m.createdAt || 0) <= end);
    }

    if (filteredMatches.length === 0) {
      return {
        format,
        category,
        scope,
        tournamentId,
        asOfDate: options.asOfDate ? new Date(options.asOfDate).toISOString().split('T')[0] : null,
        availableMatchDates,
        totalMatchesCount: 0,
        topBatters: [],
        topBowlers: [],
        topAllRounders: [],
      };
    }

    const currentMatchIds = filteredMatches.map(m => m._id);
    const { sortedBatters, sortedBowlers, sortedAllRounders } = await this.calculatePlayerRankingsForMatches(
      currentMatchIds,
      format,
      scope,
      limit
    );

    // Compute Previous Match State for Rank Trends
    const matchTimes = filteredMatches
      .map(m => new Date(m.date || m.createdAt || 0).getTime())
      .filter(t => t > 0);
    const latestTime = matchTimes.length > 0 ? Math.max(...matchTimes) : 0;

    // Previous matches are those played strictly before the latest match time/day
    const previousMatches = filteredMatches.filter(
      m => new Date(m.date || m.createdAt || 0).getTime() < latestTime
    );

    let prevBatterRankMap = new Map<string, number>();
    let prevBowlerRankMap = new Map<string, number>();
    let prevArRankMap = new Map<string, number>();

    if (previousMatches.length > 0) {
      const prevIds = previousMatches.map(m => m._id);
      const prevRes = await this.calculatePlayerRankingsForMatches(prevIds, format, scope, 50);
      prevBatterRankMap = new Map(prevRes.sortedBatters.map(b => [b.playerId, b.rank!]));
      prevBowlerRankMap = new Map(prevRes.sortedBowlers.map(bw => [bw.playerId, bw.rank!]));
      prevArRankMap = new Map(prevRes.sortedAllRounders.map(ar => [ar.playerId, ar.rank!]));
    }

    // Attach Trend to topBatters
    const finalBatters = sortedBatters.map(b => {
      const prevRank = previousMatches.length > 0 ? (prevBatterRankMap.get(b.playerId) ?? null) : null;
      const isNew = prevRank === null;
      const change = prevRank !== null ? (prevRank - b.rank!) : 0;
      return {
        ...b,
        trend: {
          previousRank: prevRank,
          change,
          isNew,
        },
      };
    });

    // Attach Trend to topBowlers
    const finalBowlers = sortedBowlers.map(bw => {
      const prevRank = previousMatches.length > 0 ? (prevBowlerRankMap.get(bw.playerId) ?? null) : null;
      const isNew = prevRank === null;
      const change = prevRank !== null ? (prevRank - bw.rank!) : 0;
      return {
        ...bw,
        trend: {
          previousRank: prevRank,
          change,
          isNew,
        },
      };
    });

    // Attach Trend to topAllRounders
    const finalAllRounders = sortedAllRounders.map(ar => {
      const prevRank = previousMatches.length > 0 ? (prevArRankMap.get(ar.playerId) ?? null) : null;
      const isNew = prevRank === null;
      const change = prevRank !== null ? (prevRank - ar.rank!) : 0;
      return {
        ...ar,
        trend: {
          previousRank: prevRank,
          change,
          isNew,
        },
      };
    });

    return {
      format,
      category,
      scope,
      tournamentId,
      asOfDate: options.asOfDate ? new Date(options.asOfDate).toISOString().split('T')[0] : null,
      availableMatchDates,
      totalMatchesCount: filteredMatches.length,
      topBatters: (category === 'all' || category === 'batters') ? finalBatters : [],
      topBowlers: (category === 'all' || category === 'bowlers') ? finalBowlers : [],
      topAllRounders: (category === 'all' || category === 'all-rounders') ? finalAllRounders : [],
    };
  }

  /**
   * Calculate chronological days each player held #1 (and Top 3) across all formats
   */
  public async calculateAllPlayerReigns(userId?: string): Promise<Map<string, PlayerReignStats>> {
    const matchQuery: any = userId ? { createdBy: new Types.ObjectId(userId) } : {};
    const allMatches = await Match.find(matchQuery).select('_id overs format date createdAt').lean();

    const formats: Array<'T20' | 'ODI' | 'Test'> = ['T20', 'ODI', 'Test'];
    const reignMap = new Map<string, PlayerReignStats>();

    const getOrInit = (pId: string, pName: string): PlayerReignStats => {
      if (!reignMap.has(pId)) {
        reignMap.set(pId, {
          playerId: pId,
          playerName: pName,
          daysAtNo1: 0,
          daysInTop3: 0,
          longestReignDays: 0,
          isCurrentlyNo1: false,
          currentNo1Categories: [],
          breakdown: [],
        });
      }
      return reignMap.get(pId)!;
    };

    for (const fmt of formats) {
      const formatMatches = allMatches.filter(m => {
        return RatingService.detectMatchFormat({ format: m.format, overs: m.overs }) === fmt;
      });

      if (formatMatches.length === 0) continue;

      const matchDates = Array.from(
        new Set(
          formatMatches
            .map(m => (m.date ? new Date(m.date).toISOString().split('T')[0] : (m.createdAt ? new Date(m.createdAt).toISOString().split('T')[0] : null)))
            .filter(Boolean) as string[]
        )
      ).sort();

      if (matchDates.length === 0) continue;

      const catAccumulator = new Map<string, { daysAtNo1: number; daysInTop3: number; isCurrentNo1: boolean }>();

      for (let i = 0; i < matchDates.length; i++) {
        const dStr = matchDates[i];
        const fromDate = new Date(dStr);
        const toDate = (i < matchDates.length - 1) ? new Date(matchDates[i + 1]) : new Date();
        const diffMs = toDate.getTime() - fromDate.getTime();
        const intervalDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        const isLatestInterval = (i === matchDates.length - 1);

        const cutoff = new Date(dStr);
        cutoff.setHours(23, 59, 59, 999);
        const matchesUpTo = formatMatches.filter(m => new Date(m.date || m.createdAt || 0) <= cutoff);
        const matchIds = matchesUpTo.map(m => m._id);

        const rankRes = await this.calculatePlayerRankingsForMatches(matchIds, fmt, 'career', 5);

        const categoriesData: Array<{ catKey: string; label: string; list: any[] }> = [
          { catKey: 'batters', label: 'Batting', list: rankRes.sortedBatters },
          { catKey: 'bowlers', label: 'Bowling', list: rankRes.sortedBowlers },
          { catKey: 'all-rounders', label: 'All-Rounder', list: rankRes.sortedAllRounders },
        ];

        for (const cat of categoriesData) {
          if (cat.list.length === 0) continue;

          // Rank 1
          const no1Player = cat.list[0];
          const no1Id = no1Player.playerId;
          const pStats = getOrInit(no1Id, no1Player.playerName);
          pStats.daysAtNo1 += intervalDays;
          pStats.longestReignDays = Math.max(pStats.longestReignDays, intervalDays);

          const accKey = `${no1Id}_${fmt}_${cat.catKey}`;
          if (!catAccumulator.has(accKey)) {
            catAccumulator.set(accKey, { daysAtNo1: 0, daysInTop3: 0, isCurrentNo1: false });
          }
          const acc = catAccumulator.get(accKey)!;
          acc.daysAtNo1 += intervalDays;

          if (isLatestInterval) {
            pStats.isCurrentlyNo1 = true;
            acc.isCurrentNo1 = true;
            const catName = `${fmt} ${cat.label}`;
            if (!pStats.currentNo1Categories.includes(catName)) {
              pStats.currentNo1Categories.push(catName);
            }
          }

          // Top 3
          for (const topP of cat.list.slice(0, 3)) {
            const topId = topP.playerId;
            const topStats = getOrInit(topId, topP.playerName);
            topStats.daysInTop3 += intervalDays;

            const topAccKey = `${topId}_${fmt}_${cat.catKey}`;
            if (!catAccumulator.has(topAccKey)) {
              catAccumulator.set(topAccKey, { daysAtNo1: 0, daysInTop3: 0, isCurrentNo1: false });
            }
            catAccumulator.get(topAccKey)!.daysInTop3 += intervalDays;
          }
        }
      }

      // Populate breakdown into player stats
      for (const [key, data] of catAccumulator.entries()) {
        const [pId, fName, cKey] = key.split('_');
        const pStats = reignMap.get(pId);
        if (pStats) {
          const catLabel = cKey === 'batters' ? 'Batting' : cKey === 'bowlers' ? 'Bowling' : 'All-Rounder';
          pStats.breakdown.push({
            format: fName,
            category: catLabel,
            daysAtNo1: data.daysAtNo1,
            daysInTop3: data.daysInTop3,
            isCurrentNo1: data.isCurrentNo1,
          });
        }
      }
    }

    return reignMap;
  }

  /**
   * Get reign statistics for a single player
   */
  public async getPlayerReignStats(playerId: string | Types.ObjectId, userId?: string): Promise<PlayerReignStats | null> {
    const allReigns = await this.calculateAllPlayerReigns(userId);
    return allReigns.get(playerId.toString()) || null;
  }

  /**
   * Get the top reign record to include in cricket records
   */
  public async getTopReignRecord(userId?: string) {
    const allReigns = await this.calculateAllPlayerReigns(userId);
    const reignList = Array.from(allReigns.values()).filter(r => r.daysAtNo1 > 0);
    if (reignList.length === 0) return null;

    reignList.sort((a, b) => b.daysAtNo1 - a.daysAtNo1);
    const top = reignList[0];

    const details = top.breakdown
      .filter(b => b.daysAtNo1 > 0)
      .map(b => `${b.format} ${b.category} (${b.daysAtNo1}d)`)
      .join(' · ');

    return {
      playerId: top.playerId,
      playerName: top.playerName,
      daysAtNo1: top.daysAtNo1,
      daysInTop3: top.daysInTop3,
      isCurrentlyNo1: top.isCurrentlyNo1,
      currentCategories: top.currentNo1Categories,
      details: details || `${top.daysAtNo1} days reigning as World #1`,
    };
  }

  /**
   * Get all No. 1 reign records for the dedicated Records column
   */
  public async getReignRecords(userId?: string) {
    const allReigns = await this.calculateAllPlayerReigns(userId);
    const reignList = Array.from(allReigns.values()).filter(r => r.daysAtNo1 > 0);
    if (reignList.length === 0) return [];

    reignList.sort((a, b) => b.daysAtNo1 - a.daysAtNo1);

    const records: any[] = [];

    // 1. Most Days at World #1 (All-Time King)
    const topKing = reignList[0];
    const topDetails = topKing.breakdown
      .filter(b => b.daysAtNo1 > 0)
      .map(b => `${b.format} ${b.category} (${b.daysAtNo1}d)`)
      .join(' · ');

    records.push({
      id: 'all_time_no1_king',
      title: 'Most Days Ranked World #1',
      category: 'World #1 Reign',
      badge: '👑 ALL-TIME #1',
      statValue: `${topKing.daysAtNo1} Days`,
      statLabel: 'World #1 Leaderboard Reign',
      playerId: topKing.playerId,
      playerName: topKing.playerName,
      details: topDetails || `${topKing.daysAtNo1} days reigning as World #1`,
    });

    // 2. Longest Unbroken Streak at World #1
    const byStreak = [...reignList].sort((a, b) => b.longestReignDays - a.longestReignDays);
    const topStreak = byStreak[0];
    if (topStreak && topStreak.longestReignDays > 0) {
      records.push({
        id: 'longest_no1_streak',
        title: 'Longest Unbroken World #1 Streak',
        category: 'World #1 Reign',
        badge: '⚡ DYNASTY STREAK',
        statValue: `${topStreak.longestReignDays} Days`,
        statLabel: 'Continuous Reign Without Losing Rank',
        playerId: topStreak.playerId,
        playerName: topStreak.playerName,
        details: `Held the #1 spot continuously for ${topStreak.longestReignDays} days`,
      });
    }

    // 3. 2nd Most Days at World #1 (if another player exists)
    if (reignList.length > 1) {
      const secondKing = reignList[1];
      const secondDetails = secondKing.breakdown
        .filter(b => b.daysAtNo1 > 0)
        .map(b => `${b.format} ${b.category} (${b.daysAtNo1}d)`)
        .join(' · ');

      records.push({
        id: 'second_most_no1_days',
        title: 'Runner-Up: Most Days at World #1',
        category: 'World #1 Reign',
        badge: '🥈 PODIUM REIGN',
        statValue: `${secondKing.daysAtNo1} Days`,
        statLabel: 'World #1 Leaderboard Reign',
        playerId: secondKing.playerId,
        playerName: secondKing.playerName,
        details: secondDetails || `${secondKing.daysAtNo1} days reigning as World #1`,
      });
    }

    return records;
  }
}
