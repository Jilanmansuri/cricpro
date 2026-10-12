/**
 * Format-Specific Cricket Player Rating Benchmarks
 * 
 * IMPORTANT NOTE:
 * These benchmarks are game-specific, tunable calibration parameters designed to produce
 * balanced, normalized 0-100 rating distributions for simulated and recorded cricket matches.
 * They are inspired by professional cricket analytics and balanced performance scales,
 * and are NOT official proprietary ICC rating formula values.
 */

export interface FormatBenchmarks {
  format: 'T20' | 'ODI' | 'Test';
  batting: {
    minRunsPerMatch: number;
    maxRunsPerMatch: number;
    minAverage: number;
    maxAverage: number;
    minStrikeRate: number;
    maxStrikeRate: number;
    // Opportunities & Eligibility Thresholds
    minMatchesCareer: number;
    minMatchesTournament: number;
    minInningsCareer: number;
    minInningsTournament: number;
    minBallsFacedCareer: number;
    minBallsFacedTournament: number;
    // Reliability Confidence Threshold (matches required for 100% confidence)
    confidenceMatchesCareer: number;
    confidenceMatchesTournament: number;
    // Format benchmark good score threshold for consistency calculation
    goodScoreThreshold: number;
  };
  bowling: {
    minWicketsPerMatch: number;
    maxWicketsPerMatch: number;
    minEconomy: number; // Elite economy (earns ~100 points)
    maxEconomy: number; // Poor economy (earns ~0 points)
    minAverage: number; // Elite bowling average (earns ~100 points)
    maxAverage: number; // Poor bowling average (earns ~0 points)
    // Opportunities & Eligibility Thresholds (measured in integer legal balls)
    minLegalBallsCareer: number;      // e.g. 36 legal balls = 6 overs
    minLegalBallsTournament: number;  // e.g. 12 legal balls = 2 overs
    minInningsCareer: number;
    minInningsTournament: number;
    // Reliability Confidence Threshold (legal balls required for 100% confidence)
    confidenceLegalBallsCareer: number;
    confidenceLegalBallsTournament: number;
  };
  allRounder: {
    minBattingBallsFacedCareer: number;
    minBattingBallsFacedTournament: number;
    minBowlingLegalBallsCareer: number;
    minBowlingLegalBallsTournament: number;
    minMatchesCareer: number;
    minMatchesTournament: number;
  };
}

export const RATING_BENCHMARKS: Record<'T20' | 'ODI' | 'Test', FormatBenchmarks> = {
  T20: {
    format: 'T20',
    batting: {
      minRunsPerMatch: 10.0,
      maxRunsPerMatch: 45.0,
      minAverage: 15.0,
      maxAverage: 45.0,
      minStrikeRate: 100.0,
      maxStrikeRate: 175.0,
      minMatchesCareer: 3,
      minMatchesTournament: 1,
      minInningsCareer: 3,
      minInningsTournament: 1,
      minBallsFacedCareer: 25,
      minBallsFacedTournament: 10,
      confidenceMatchesCareer: 5,
      confidenceMatchesTournament: 3,
      goodScoreThreshold: 20,
    },
    bowling: {
      minWicketsPerMatch: 0.5,
      maxWicketsPerMatch: 2.5,
      minEconomy: 6.0,  // Elite T20 economy
      maxEconomy: 10.5, // Poor T20 economy
      minAverage: 16.0, // Elite bowling average
      maxAverage: 38.0, // Poor bowling average
      minLegalBallsCareer: 36,     // 6 overs
      minLegalBallsTournament: 12, // 2 overs
      minInningsCareer: 3,
      minInningsTournament: 1,
      confidenceLegalBallsCareer: 72,     // 12 overs
      confidenceLegalBallsTournament: 36, // 6 overs
    },
    allRounder: {
      minBattingBallsFacedCareer: 25,
      minBattingBallsFacedTournament: 10,
      minBowlingLegalBallsCareer: 36,     // 6 overs
      minBowlingLegalBallsTournament: 12, // 2 overs
      minMatchesCareer: 3,
      minMatchesTournament: 1,
    },
  },
  ODI: {
    format: 'ODI',
    batting: {
      minRunsPerMatch: 15.0,
      maxRunsPerMatch: 55.0,
      minAverage: 20.0,
      maxAverage: 55.0,
      minStrikeRate: 70.0,
      maxStrikeRate: 115.0,
      minMatchesCareer: 3,
      minMatchesTournament: 1,
      minInningsCareer: 3,
      minInningsTournament: 1,
      minBallsFacedCareer: 45,
      minBallsFacedTournament: 20,
      confidenceMatchesCareer: 6,
      confidenceMatchesTournament: 3,
      goodScoreThreshold: 30,
    },
    bowling: {
      minWicketsPerMatch: 0.8,
      maxWicketsPerMatch: 3.0,
      minEconomy: 4.2,  // Elite ODI economy
      maxEconomy: 7.0,  // Poor ODI economy
      minAverage: 20.0, // Elite bowling average
      maxAverage: 45.0, // Poor bowling average
      minLegalBallsCareer: 72,     // 12 overs
      minLegalBallsTournament: 24, // 4 overs
      minInningsCareer: 3,
      minInningsTournament: 1,
      confidenceLegalBallsCareer: 144,    // 24 overs
      confidenceLegalBallsTournament: 60, // 10 overs
    },
    allRounder: {
      minBattingBallsFacedCareer: 45,
      minBattingBallsFacedTournament: 20,
      minBowlingLegalBallsCareer: 72,
      minBowlingLegalBallsTournament: 24,
      minMatchesCareer: 3,
      minMatchesTournament: 1,
    },
  },
  Test: {
    format: 'Test',
    batting: {
      minRunsPerMatch: 20.0,
      maxRunsPerMatch: 75.0,
      minAverage: 25.0,
      maxAverage: 60.0,
      minStrikeRate: 45.0,
      maxStrikeRate: 85.0,
      minMatchesCareer: 2,
      minMatchesTournament: 1,
      minInningsCareer: 2,
      minInningsTournament: 1,
      minBallsFacedCareer: 60,
      minBallsFacedTournament: 30,
      confidenceMatchesCareer: 4,
      confidenceMatchesTournament: 2,
      goodScoreThreshold: 40,
    },
    bowling: {
      minWicketsPerMatch: 1.0,
      maxWicketsPerMatch: 4.5,
      minEconomy: 2.5,  // Elite Test economy
      maxEconomy: 4.5,  // Poor Test economy
      minAverage: 22.0, // Elite bowling average
      maxAverage: 50.0, // Poor bowling average
      minLegalBallsCareer: 120,    // 20 overs
      minLegalBallsTournament: 48, // 8 overs
      minInningsCareer: 2,
      minInningsTournament: 1,
      confidenceLegalBallsCareer: 240,    // 40 overs
      confidenceLegalBallsTournament: 96, // 16 overs
    },
    allRounder: {
      minBattingBallsFacedCareer: 60,
      minBattingBallsFacedTournament: 30,
      minBowlingLegalBallsCareer: 120,
      minBowlingLegalBallsTournament: 48,
      minMatchesCareer: 2,
      minMatchesTournament: 1,
    },
  },
};
