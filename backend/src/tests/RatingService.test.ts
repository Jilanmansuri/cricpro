import { RatingService } from '../services/RatingService';
import { RATING_BENCHMARKS } from '../config/ratingBenchmarks';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('=== RUNNING COMPREHENSIVE RATING SERVICE ACCEPTANCE TESTS ===\n');

  // Test 1: Integer legal balls calculation
  console.log('Test 1: Cricket overs conversion to integer legal balls');
  const b1 = RatingService.oversToLegalBalls(4.2);
  assert(b1 === 26, `4.2 overs converted to 26 legal balls (received ${b1})`);

  const b2 = RatingService.oversToLegalBalls(3.5);
  assert(b2 === 23, `3.5 overs converted to 23 legal balls (received ${b2})`);

  const b3 = RatingService.oversToLegalBalls(10.0);
  assert(b3 === 60, `10.0 overs converted to 60 legal balls (received ${b3})`);

  const o1 = RatingService.legalBallsToOvers(26);
  assert(Math.abs(o1 - 4.2) < 0.001, `26 legal balls converted to 4.2 overs (received ${o1})`);

  // Test 2: Economy calculation using legal balls
  console.log('\nTest 2: Economy calculation using legal balls ((runs / balls) * 6)');
  // 26 legal balls (4.2 overs), 24 runs conceded => Economy = (24 / 26) * 6 = 5.538
  const bowlerWithPartOver = [
    { bowling: { didNotBowl: false, overs: 4.2, maidens: 0, runsConceded: 24, wickets: 2 } },
    { bowling: { didNotBowl: false, overs: 4.0, maidens: 0, runsConceded: 20, wickets: 1 } },
  ]; // Total legal balls: 26 + 24 = 50 balls. Runs: 44. Economy = (44 / 50) * 6 = 5.28
  const bowlerRes = RatingService.calculateBowlerRating(bowlerWithPartOver, RATING_BENCHMARKS.T20.bowling, 'career');
  assert(bowlerRes.stats.legalBalls === 50, `Total legal balls correctly aggregated to 50 (received ${bowlerRes.stats.legalBalls})`);
  assert(Math.abs(bowlerRes.stats.economy - 5.28) < 0.05, `Economy correctly calculated to 5.28 (received ${bowlerRes.stats.economy})`);

  // Test 3: Format detection priority (explicit format vs overs vs custom)
  console.log('\nTest 3: Format detection priority');
  assert(RatingService.detectMatchFormat({ format: 'T20', overs: 50 }) === 'T20',
    'Explicit format "T20" honored even if overs is 50');
  assert(RatingService.detectMatchFormat({ format: 'ODI', overs: 20 }) === 'ODI',
    'Explicit format "ODI" honored even if overs is 20');
  assert(RatingService.detectMatchFormat({ format: 'Test Match', overs: 90 }) === 'Test',
    'Explicit format "Test Match" detected as Test');
  assert(RatingService.detectMatchFormat({ overs: 20 }) === 'T20',
    'Fallback overs <= 20 detected as T20 when format absent');
  assert(RatingService.detectMatchFormat({ overs: 50 }) === 'ODI',
    'Fallback overs 50 detected as ODI when format absent');

  // Test 4: Consistency calculation robustness (zero mean, few innings, 0-100 clamping)
  console.log('\nTest 4: Consistency calculation robustness');
  const consZero = RatingService.calculateConsistencyScore([0, 0, 0], 20);
  assert(consZero >= 0 && consZero <= 100, `Zero runs consistency clamped safely: ${consZero}`);

  const consSingle = RatingService.calculateConsistencyScore([45], 20);
  assert(consSingle >= 0 && consSingle <= 100, `Single score consistency clamped safely: ${consSingle}`);

  const consVaried = RatingService.calculateConsistencyScore([25, 30, 28, 32, 27], 20);
  assert(consVaried > 70, `High consistency group scores high: ${consVaried}`);

  // Test 5: Reliability adjustment with 50-point baseline across sample sizes
  console.log('\nTest 5: Sample-size reliability adjustment (Bayesian shrinkage)');
  const singleMatchExplosion = [
    { batting: { didNotBat: false, runs: 60, balls: 25, outStatus: 'not_out' } },
  ]; // 1 match: raw rating will be ~95, but should be damped towards 50
  const batSmall = RatingService.calculateBatterRating(singleMatchExplosion, RATING_BENCHMARKS.T20.batting, 'tournament');

  const fiveMatchSolid = [
    { batting: { didNotBat: false, runs: 40, balls: 22, outStatus: 'out' } },
    { batting: { didNotBat: false, runs: 35, balls: 20, outStatus: 'not_out' } },
    { batting: { didNotBat: false, runs: 38, balls: 20, outStatus: 'out' } },
    { batting: { didNotBat: false, runs: 42, balls: 24, outStatus: 'out' } },
    { batting: { didNotBat: false, runs: 45, balls: 25, outStatus: 'not_out' } },
  ]; // 5 matches: reliability factor is 1.0 (full confidence)
  const batConfident = RatingService.calculateBatterRating(fiveMatchSolid, RATING_BENCHMARKS.T20.batting, 'career');

  assert(batSmall.rating !== null && batSmall.rating < batSmall.rawRating,
    `1-match player damped from raw rating ${batSmall.rawRating} to ${batSmall.rating}`);
  assert(batConfident.rating !== null && Math.abs(batConfident.rating - batConfident.rawRating) < 1.0,
    `5-match confident player preserves high raw rating (${batConfident.rating} ≈ ${batConfident.rawRating})`);

  // Test 6: All-Rounder eligibility requires genuine opportunities (balls faced and legal balls bowled)
  console.log('\nTest 6: All-Rounder true opportunities requirement');
  const solidBat = RatingService.calculateBatterRating([
    { batting: { didNotBat: false, runs: 35, balls: 25, outStatus: 'out' } },
    { batting: { didNotBat: false, runs: 30, balls: 20, outStatus: 'out' } },
    { batting: { didNotBat: false, runs: 28, balls: 18, outStatus: 'out' } },
  ], RATING_BENCHMARKS.T20.batting, 'career'); // 63 balls faced

  const tokenBowl = RatingService.calculateBowlerRating([
    { bowling: { didNotBowl: false, overs: 0.2, maidens: 0, runsConceded: 2, wickets: 0 } }, // Only 2 legal balls bowled!
  ], RATING_BENCHMARKS.T20.bowling, 'career');

  const tokenAr = RatingService.calculateAllRounderRating(
    solidBat,
    tokenBowl,
    RATING_BENCHMARKS.T20.allRounder,
    3,
    'career'
  );
  assert(tokenAr.isEligible === false && tokenAr.rating === null,
    'Player with only 2 legal balls bowled rejected as ineligible for All-Rounder');

  const qualifiedBowl = RatingService.calculateBowlerRating([
    { bowling: { didNotBowl: false, overs: 4, maidens: 0, runsConceded: 28, wickets: 2 } }, // 24 balls
    { bowling: { didNotBowl: false, overs: 4, maidens: 0, runsConceded: 24, wickets: 1 } }, // 24 balls -> total 48 balls
  ], RATING_BENCHMARKS.T20.bowling, 'career');

  const qualifiedAr = RatingService.calculateAllRounderRating(
    solidBat,
    qualifiedBowl,
    RATING_BENCHMARKS.T20.allRounder,
    3,
    'career'
  );
  assert(qualifiedAr.isEligible === true && qualifiedAr.rating !== null && qualifiedAr.rating > 0,
    `Genuinely qualified all-rounder receives rating: ${qualifiedAr.rating}`);

  // Test 7: Benchmark range testing (below, within, and above benchmark)
  console.log('\nTest 7: Benchmark boundary validation (below, within, above)');
  // Below min strike rate (SR 60 in T20 min 100)
  const belowScore = RatingService.normalizeLinear(60, RATING_BENCHMARKS.T20.batting.minStrikeRate, RATING_BENCHMARKS.T20.batting.maxStrikeRate);
  assert(belowScore === 0, `Below benchmark score clamped to 0 (received ${belowScore})`);

  // Within benchmark (SR 137.5 in T20 [100 - 175] => exactly 50)
  const midScore = RatingService.normalizeLinear(137.5, RATING_BENCHMARKS.T20.batting.minStrikeRate, RATING_BENCHMARKS.T20.batting.maxStrikeRate);
  assert(midScore === 50, `Midpoint benchmark score normalized to 50 (received ${midScore})`);

  // Above benchmark (SR 220 in T20 max 175)
  const aboveScore = RatingService.normalizeLinear(220, RATING_BENCHMARKS.T20.batting.minStrikeRate, RATING_BENCHMARKS.T20.batting.maxStrikeRate);
  assert(aboveScore === 100, `Above benchmark score clamped to 100 (received ${aboveScore})`);

  // Test 8: Division by zero safety
  console.log('\nTest 8: Division by zero safety');
  const dnbStats = RatingService.calculateBatterRating([
    { batting: { didNotBat: true, runs: 0, balls: 0, outStatus: 'DNB' } }
  ], RATING_BENCHMARKS.T20.batting, 'career');
  assert(!isNaN(dnbStats.rawRating) && dnbStats.rawRating >= 0,
    `DNB player handled safely without NaN: rawRating=${dnbStats.rawRating}`);

  console.log('\n=== ALL 8 ACCEPTANCE TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch(err => {
  console.error('\n❌ Test Error:', err);
  process.exit(1);
});
