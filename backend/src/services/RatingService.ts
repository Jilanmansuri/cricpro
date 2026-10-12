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

export interface BatterRatingResult {
  playerId: string;
  playerName: string;
  rating: number | null;
  rawRating: number;
  isEligible: boolean;
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

export interface RankingOptions {
  format?: 'T20' | 'ODI' | 'Test';
  category?: 'batters' | 'bowlers' | 'all-rounders' | 'all';
  scope?: 'career' | 'tournament';
  tournamentId?: string;
  userId?: string;
  limit?: number;
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
   * Query and compute rankings across format, category, and scope
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

    // 1. Build Match query
    const matchQuery: any = {};
    if (userId) {
      matchQuery.createdBy = new Types.ObjectId(userId);
    }
    if (scope === 'tournament' && tournamentId) {
      matchQuery.tournamentId = new Types.ObjectId(tournamentId);
    }

    // Fetch candidate matches
    const allMatches = await Match.find(matchQuery).select('_id overs format date').lean();

    // Format filtering using explicit format field first, with fallback to overs
    const matchedMatchIds: Types.ObjectId[] = [];
    for (const m of allMatches) {
      const detected = RatingService.detectMatchFormat({ format: m.format, overs: m.overs });
      if (detected === format) {
        matchedMatchIds.push(m._id);
      }
    }

    if (matchedMatchIds.length === 0) {
      return {
        format,
        scope,
        tournamentId,
        topBatters: [],
        topBowlers: [],
        topAllRounders: [],
      };
    }

    // 2. Fetch all PlayerMatchStats for these matches
    const statsList = await PlayerMatchStats.find({
      matchId: { $in: matchedMatchIds },
    }).lean();

    // Group stats by player
    const playerStatsMap = new Map<string, any[]>();
    for (const stat of statsList) {
      const pId = stat.playerId ? stat.playerId.toString() : null;
      if (!pId) continue;
      if (!playerStatsMap.has(pId)) {
        playerStatsMap.set(pId, []);
      }
      playerStatsMap.get(pId)!.push(stat);
    }

    // 3. Fetch Player details
    const uniquePlayerIds = Array.from(playerStatsMap.keys()).map(id => new Types.ObjectId(id));
    const players = await Player.find({ _id: { $in: uniquePlayerIds } }).lean();
    const playerMap = new Map(players.map(p => [p._id.toString(), p]));

    // 4. Calculate ratings for each player
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

    // 5. Sort & Rank (Eligible with highest rating first)
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

    return {
      format,
      category,
      scope,
      tournamentId,
      topBatters: (category === 'all' || category === 'batters') ? sortedBatters : [],
      topBowlers: (category === 'all' || category === 'bowlers') ? sortedBowlers : [],
      topAllRounders: (category === 'all' || category === 'all-rounders') ? sortedAllRounders : [],
    };
  }
}
