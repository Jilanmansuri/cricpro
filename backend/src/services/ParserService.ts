export interface ParsedBattingRow {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  outStatus: string;
  confidence: number;
}

export interface ParsedBowlingRow {
  name: string;
  overs: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  confidence: number;
}

export interface ParsedScorecard {
  matchInfo: {
    teamA: string;
    teamB: string;
    teamAScore: { runs: number; wickets: number; overs: number };
    teamBScore: { runs: number; wickets: number; overs: number };
    date: string;
    venue: string;
    result: string;
    overs: number;
    mvp?: string;
  };
  teamABatting: ParsedBattingRow[];
  teamABowling: ParsedBowlingRow[];
  teamBBatting: ParsedBattingRow[];
  teamBBowling: ParsedBowlingRow[];
  confidenceScore: number;
  uncertainFields: string[];
}

export class ParserService {
  public parseScorecardText(text: string): ParsedScorecard {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const result: ParsedScorecard = {
      matchInfo: {
        teamA: '',
        teamB: '',
        teamAScore: { runs: 0, wickets: 0, overs: 0 },
        teamBScore: { runs: 0, wickets: 0, overs: 0 },
        date: '',
        venue: '',
        result: '',
        overs: 20,
        mvp: ''
      },
      teamABatting: [],
      teamABowling: [],
      teamBBatting: [],
      teamBBowling: [],
      confidenceScore: 1.0,
      uncertainFields: []
    };

    let currentSection: 'header' | 'teamA_batting' | 'teamA_bowling' | 'teamB_batting' | 'teamB_bowling' = 'header';
    let totalCertainFields = 0;
    let totalParsedFields = 0;

    const trackField = (fieldName: string, _value: any, isCertain: boolean) => {
      totalParsedFields++;
      if (isCertain) totalCertainFields++;
      else result.uncertainFields.push(fieldName);
    };

    const teamRegex = /([A-Za-z0-9\s]+)\s+vs\s+([A-Za-z0-9\s]+)/i;
    const matchResultRegex = /(won by|beat|match drawn|no result)/i;
    const dateRegex = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/;
    const oversRegex = /(\d+)\s*Overs|(\d+)\s*overs/i;

    for (const line of lines) {
      const teamMatch = line.match(teamRegex);
      if (teamMatch && !result.matchInfo.teamA) {
        result.matchInfo.teamA = teamMatch[1].trim();
        result.matchInfo.teamB = teamMatch[2].trim();
        trackField('teamA', result.matchInfo.teamA, true);
        trackField('teamB', result.matchInfo.teamB, true);
      }

      const dateMatch = line.match(dateRegex);
      if (dateMatch && !result.matchInfo.date) {
        const [,, year] = dateMatch;
        let fullYear = year;
        if (year.length === 2) fullYear = '20' + year;
        result.matchInfo.date = `${fullYear}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
        trackField('date', result.matchInfo.date, true);
      }

      const oversMatch = line.match(oversRegex);
      if (oversMatch && result.matchInfo.overs === 20) {
        const ovVal = parseInt(oversMatch[1] || oversMatch[2], 10);
        if (!isNaN(ovVal)) {
          result.matchInfo.overs = ovVal;
          trackField('overs', ovVal, true);
        }
      }

      if (matchResultRegex.test(line) && !result.matchInfo.result) {
        result.matchInfo.result = line;
        trackField('result', line, true);
      }

      if ((line.toLowerCase().startsWith('at ') || /stadium|ground|oval|park|club/i.test(line)) && !result.matchInfo.venue) {
        result.matchInfo.venue = line.replace(/^at\s+/i, '').trim();
        trackField('venue', result.matchInfo.venue, true);
      }

      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('batting') || lowerLine.includes('batsman') || lowerLine.includes('batsmen')) {
        if (currentSection === 'header' || currentSection === 'teamA_bowling') {
          currentSection = 'teamA_batting';
        } else {
          currentSection = 'teamB_batting';
        }
        continue;
      }
      if (lowerLine.includes('bowling') || lowerLine.includes('bowlers') || lowerLine.includes('bowler')) {
        if (currentSection === 'teamA_batting') {
          currentSection = 'teamA_bowling';
        } else if (currentSection === 'teamB_batting') {
          currentSection = 'teamB_bowling';
        }
        continue;
      }

      if (currentSection === 'teamA_batting' || currentSection === 'teamB_batting') {
        const battingStatMatch = line.match(/(.+?)\s+(not out|dnb|retired|c\s+.*?|b\s+.*?|lbw\s+.*?|run out|stumped|hit wicket)?\s*(\d+)\s+(\d+)(?:\s+(\d+))?(?:\s+(\d+))?(?:\s+[\d.]+)?$/i);
        
        if (battingStatMatch) {
          const name = battingStatMatch[1].trim();
          const rawStatus = battingStatMatch[2] || '';
          const runs = parseInt(battingStatMatch[3], 10);
          const balls = parseInt(battingStatMatch[4], 10);
          const fours = battingStatMatch[5] ? parseInt(battingStatMatch[5], 10) : 0;
          const sixes = battingStatMatch[6] ? parseInt(battingStatMatch[6], 10) : 0;
          
          let outStatus = 'out';
          if (rawStatus.toLowerCase().includes('not out')) {
            outStatus = 'not_out';
          } else if (rawStatus.toLowerCase().includes('dnb')) {
            outStatus = 'dnb';
          }

          const confidence = 1.0;
          const row: ParsedBattingRow = { name, runs, balls, fours, sixes, outStatus, confidence };
          
          if (currentSection === 'teamA_batting') {
            result.teamABatting.push(row);
          } else {
            result.teamBBatting.push(row);
          }
          trackField(`${currentSection}_player_${name}_runs`, runs, true);
        } else {
          const basicBat = line.match(/^([A-Za-z\s.]+)\s+(\d+)\s*$/);
          if (basicBat) {
            const name = basicBat[1].trim();
            const runs = parseInt(basicBat[2], 10);
            const row: ParsedBattingRow = { name, runs, balls: runs * 1.2, fours: 0, sixes: 0, outStatus: 'out', confidence: 0.6 };
            if (currentSection === 'teamA_batting') {
              result.teamABatting.push(row);
            } else {
              result.teamBBatting.push(row);
            }
            trackField(`${currentSection}_player_${name}_runs`, runs, false);
          }
        }
      }

      if (currentSection === 'teamA_bowling' || currentSection === 'teamB_bowling') {
        const bowlingStatMatch = line.match(/(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+)\s+(\d+)\s+(\d+)(?:\s+[\d.]+)?$/);
        const hyphenBowlerMatch = line.match(/(.+?)\s+(\d+(?:\.\d+)?)-(\d+)-(\d+)-(\d+)/);

        const matchObj = bowlingStatMatch || hyphenBowlerMatch;

        if (matchObj) {
          const name = matchObj[1].trim();
          const overs = parseFloat(matchObj[2]);
          const maidens = parseInt(matchObj[3], 10);
          const runsConceded = parseInt(matchObj[4], 10);
          const wickets = parseInt(matchObj[5], 10);

          const confidence = 1.0;
          const row: ParsedBowlingRow = { name, overs, maidens, runsConceded, wickets, confidence };

          if (currentSection === 'teamA_bowling') {
            result.teamABowling.push(row);
          } else {
            result.teamBBowling.push(row);
          }
          trackField(`${currentSection}_player_${name}_wickets`, wickets, true);
        }
      }
    }

    if (result.teamABatting.length > 0) {
      const totalRuns = result.teamABatting.reduce((sum, p) => sum + p.runs, 0);
      const wickets = result.teamABatting.filter(p => p.outStatus === 'out').length;
      result.matchInfo.teamAScore = { runs: totalRuns, wickets, overs: result.matchInfo.overs };
    }
    if (result.teamBBatting.length > 0) {
      const totalRuns = result.teamBBatting.reduce((sum, p) => sum + p.runs, 0);
      const wickets = result.teamBBatting.filter(p => p.outStatus === 'out').length;
      result.matchInfo.teamBScore = { runs: totalRuns, wickets, overs: result.matchInfo.overs };
    }

    // Removed fallback to 'Team A' and 'Team B' so they can remain empty strings if missing.

    if (totalParsedFields > 0) {
      result.confidenceScore = parseFloat((totalCertainFields / totalParsedFields).toFixed(2));
    } else {
      result.confidenceScore = 0.3;
    }

    return result;
  }
}
export default ParserService;
