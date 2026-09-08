import assert from 'assert';
import { ScorecardValidationService } from '../services/ScorecardValidationService';
import { TeamMatchingService } from '../services/TeamMatchingService';

console.log('--- CRICPRO SCORECARD SCANNING & VALIDATION PIPELINE TESTS ---');

async function testScorecardValidation() {
  console.log('Running test: ScorecardValidationService integrity rules...');
  const validator = new ScorecardValidationService();

  // 1. Test overs to balls conversion
  const balls1 = validator.oversToBalls(19.4);
  assert.strictEqual(balls1, 118, '19.4 overs must equal 118 legal balls');
  const overs1 = validator.ballsToOvers(118);
  assert.strictEqual(overs1, 19.4, '118 balls must equal 19.4 overs');
  console.log('✓ Overs and balls arithmetic verified');

  // 2. Test mathematical consistency check with matching totals
  const validScorecard = {
    match: {
      teamA: 'India',
      teamB: 'Australia',
      overs: 20,
      date: '2026-03-10'
    },
    innings: [
      {
        inningsNumber: 1,
        battingTeam: 'India',
        bowlingTeam: 'Australia',
        total: { runs: 172, wickets: 2, overs: 8.0 },
        batters: [
          { name: 'Rohit Sharma', runs: 50, balls: 30, fours: 4, sixes: 3, dismissalStatus: 'out' },
          { name: 'Virat Kohli', runs: 82, balls: 53, fours: 6, sixes: 4, dismissalStatus: 'not_out' },
          { name: 'Hardik Pandya', runs: 30, balls: 15, fours: 2, sixes: 2, dismissalStatus: 'out' }
        ],
        bowlers: [
          { name: 'Mitchell Starc', overs: 4.0, maidens: 0, runsConceded: 35, wickets: 1 },
          { name: 'Pat Cummins', overs: 4.0, maidens: 0, runsConceded: 40, wickets: 1 }
        ],
        extras: {
          wides: 5,
          noBalls: 1,
          byes: 0,
          legByes: 4,
          penalty: 0,
          total: 10
        }
      }
    ]
  };

  const validationRes = validator.validateScorecard(validScorecard);
  assert.strictEqual(validationRes.isValid, true, 'Scorecard with consistent math should be valid');
  assert.strictEqual(validationRes.warnings.length, 0, 'Should have 0 warnings for valid scorecard');
  console.log('✓ Valid scorecard consistency passed (Batting: 162 + Extras: 10 = Total: 172)');

  // 3. Test detection of runs discrepancy
  const mismatchedScorecard = {
    match: {
      teamA: 'India',
      teamB: 'Australia',
      overs: 20
    },
    innings: [
      {
        inningsNumber: 1,
        total: { runs: 200, wickets: 2, overs: 8.0 }, // 200 stated, but 162 + 10 = 172
        batters: [
          { name: 'Rohit Sharma', runs: 50, balls: 30, dismissalStatus: 'out' },
          { name: 'Virat Kohli', runs: 82, balls: 53, dismissalStatus: 'not_out' },
          { name: 'Hardik Pandya', runs: 30, balls: 15, dismissalStatus: 'out' }
        ],
        bowlers: [
          { name: 'Mitchell Starc', overs: 4.0, maidens: 0, runsConceded: 35, wickets: 1 }
        ],
        extras: { total: 10 }
      }
    ]
  };

  const mismatchRes = validator.validateScorecard(mismatchedScorecard);
  assert.strictEqual(mismatchRes.isValid, false, 'Scorecard with mismatch must be flagged invalid');
  assert.strictEqual(mismatchRes.warnings.some(w => w.includes('differs from Batting sum')), true, 'Must produce a warning about runs mismatch');
  console.log('✓ Scorecard discrepancy detection passed');
}

async function testTeamMatching() {
  console.log('Running test: TeamMatchingService abbreviation and aliases...');
  const matcher = new TeamMatchingService();

  // Test Levenshtein distance
  const dist = (matcher as any).getLevenshteinDistance('india', 'ind');
  assert.strictEqual(dist, 2, 'Distance between india and ind should be 2');

  // Test Initials generator
  const initials1 = (matcher as any).getInitials('Chennai Super Kings');
  assert.strictEqual(initials1, 'csk', 'Initials for Chennai Super Kings must be csk');

  const initials2 = (matcher as any).getInitials('Royal Challengers Bangalore');
  assert.strictEqual(initials2, 'rcb', 'Initials for Royal Challengers Bangalore must be rcb');

  const initials3 = (matcher as any).getInitials('Mumbai Indians');
  assert.strictEqual(initials3, 'mi', 'Initials for Mumbai Indians must be mi');

  console.log('✓ Team initials generation passed (CSK, RCB, MI)');
}

async function run() {
  try {
    await testScorecardValidation();
    await testTeamMatching();
    console.log('========================================================');
    console.log('ALL SCORECARD SCANNING & VALIDATION UNIT TESTS PASSED! 🎉');
    console.log('========================================================');
    process.exit(0);
  } catch (error) {
    console.error('Test Suite Failure:', error);
    process.exit(1);
  }
}

run();
