import assert from 'assert';
import { TeamMatchingService } from '../services/TeamMatchingService';

console.log('--- CRICPRO TEAM MASTER DATABASE ARCHITECTURE TESTS ---');

async function testTeamNormalization() {
  console.log('Running test: TeamNormalization and OCR error correction...');
  const matcher = new TeamMatchingService();

  // 1. Test punctuation and spacing normalization
  const norm1 = matcher.normalizeString('  India - Cricket (Team) .  ');
  assert.strictEqual(norm1, 'india cricket team', 'Should strip punctuation and collapse whitespace');

  const norm2 = matcher.normalizeString('Royal  Challengers:  Bangalore_');
  assert.strictEqual(norm2, 'royal challengers bangalore', 'Should normalize colons and underscores');
  console.log('✓ Normalization string pipeline passed');

  // 2. Test OCR error correction
  const ocr1 = matcher.normalizeOcrErrors('1ndia');
  assert.strictEqual(ocr1, 'india', 'Should correct leading "1" to "i" in 1ndia');

  const ocr2 = matcher.normalizeOcrErrors('|ndia');
  assert.strictEqual(ocr2, 'india', 'Should correct pipe "|" to "i"');
  console.log('✓ OCR typo character replacement passed');
}

async function testInitialsAndAcronyms() {
  console.log('Running test: Initials and acronym identification...');
  const matcher = new TeamMatchingService();

  const mi = (matcher as any).getInitials('Mumbai Indians');
  assert.strictEqual(mi, 'mi', 'Mumbai Indians initials should be mi');

  const csk = (matcher as any).getInitials('Chennai Super Kings');
  assert.strictEqual(csk, 'csk', 'Chennai Super Kings initials should be csk');

  const rcb = (matcher as any).getInitials('Royal Challengers Bangalore');
  assert.strictEqual(rcb, 'rcb', 'Royal Challengers Bangalore initials should be rcb');

  const kkr = (matcher as any).getInitials('Kolkata Knight Riders');
  assert.strictEqual(kkr, 'kkr', 'Kolkata Knight Riders initials should be kkr');
  console.log('✓ Team initials and acronym identification passed');
}

async function testConfidenceAndReviewThresholds() {
  console.log('Running test: Low confidence and needsReview behavior...');
  const matcher = new TeamMatchingService();

  // When an unknown random string is passed without matches, it should flag needsReview = true and resolved = false
  const emptyRes = await matcher.resolveTeamMaster('');
  assert.strictEqual(emptyRes.resolved, false, 'Empty team name must not be resolved');
  assert.strictEqual(emptyRes.needsReview, true, 'Empty team name must trigger needsReview');
  console.log('✓ Empty and low confidence safeguard verified');
}

async function run() {
  try {
    await testTeamNormalization();
    await testInitialsAndAcronyms();
    await testConfidenceAndReviewThresholds();
    console.log('===================================================');
    console.log('ALL TEAM MASTER ARCHITECTURE TESTS PASSED! 🎉');
    console.log('===================================================');
    process.exit(0);
  } catch (error) {
    console.error('Test Failure:', error);
    process.exit(1);
  }
}

run();
