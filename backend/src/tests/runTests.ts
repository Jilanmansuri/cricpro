import assert from 'assert';
import { PlayerMatchingService } from '../services/PlayerMatchingService';
import { StatsService } from '../services/StatsService';

// Mock simple environment testing
console.log('--- CRICSTATS PRO CORE ENGINE TESTING ---');

async function testPlayerMatching() {
  console.log('Running test: Player Matching initials...');
  const matcher = new PlayerMatchingService();

  // Test soundex code generation
  const soundex1 = (matcher as any).getSoundexCode('Virat Kohli');
  const soundex2 = (matcher as any).getSoundexCode('Virat Kholi');
  
  assert.strictEqual(soundex1, soundex2, 'Phonetic Soundex codes should match for spelling variations');
  console.log('✓ Phonetic matching test passed.');

  // Test abbreviations
  const isAbbr = (matcher as any).isAbbreviationMatch('VK', 'Virat Kohli');
  assert.strictEqual(isAbbr, true, '"VK" should abbreviate to "Virat Kohli"');
  console.log('✓ Abbreviation nickname test passed.');
}

async function testNetRunRate() {
  console.log('Running test: Net Run Rate...');
  const stats = new StatsService();

  // Test addOvers
  const oversCombined = (stats as any).addOvers(19.2, 0.4);
  assert.strictEqual(oversCombined, 20.0, '19.2 overs plus 4 balls should equal 20.0 overs');
  console.log('✓ Overs combination math passed.');

  // Test oversToBalls
  const balls = (stats as any).oversToBalls(20.0);
  assert.strictEqual(balls, 120, '20.0 overs should equal 120 balls');
  console.log('✓ Overs to balls conversion passed.');
}

async function runAll() {
  try {
    await testPlayerMatching();
    await testNetRunRate();
    console.log('====================================');
    console.log('ALL CRICSTATS PRO CORE TESTS PASSED!');
    console.log('====================================');
    process.exit(0);
  } catch (err) {
    console.error('TESTING SUITE FAILED:', err);
    process.exit(1);
  }
}

runAll();
