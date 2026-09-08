export interface ValidationResult {
  isValid: boolean;
  scorecardConfidence: number;
  warnings: string[];
  uncertainFields: string[];
}

export class ScorecardValidationService {
  /**
   * Convert overs notation (e.g. 19.4 or 4.0) into total legal balls
   */
  public oversToBalls(overs: number): number {
    const fullOvers = Math.floor(overs);
    const balls = Math.round((overs % 1) * 10);
    return fullOvers * 6 + balls;
  }

  /**
   * Convert legal balls into overs notation (e.g. 118 balls -> 19.4)
   */
  public ballsToOvers(balls: number): number {
    const fullOvers = Math.floor(balls / 6);
    const remBalls = balls % 6;
    return fullOvers + remBalls / 10;
  }

  /**
   * Validate extracted match and innings data
   */
  public validateScorecard(data: any): ValidationResult {
    const warnings: string[] = [];
    const uncertainFields: string[] = [];
    let confidenceDeductions = 0;

    if (!data.match) {
      warnings.push('Match metadata is missing');
      uncertainFields.push('match');
      return { isValid: false, scorecardConfidence: 0.1, warnings, uncertainFields };
    }

    const { teamA, teamB } = data.match;
    if (!teamA || !teamA.trim()) {
      warnings.push('Team 1 name is missing or unreadable');
      uncertainFields.push('match.teamA');
      confidenceDeductions += 0.2;
    }
    if (!teamB || !teamB.trim()) {
      warnings.push('Team 2 name is missing or unreadable');
      uncertainFields.push('match.teamB');
      confidenceDeductions += 0.2;
    }

    const inningsList = Array.isArray(data.innings) ? data.innings : [];
    if (inningsList.length === 0) {
      warnings.push('No innings data found in the scorecard');
      uncertainFields.push('innings');
      confidenceDeductions += 0.3;
    }

    inningsList.forEach((inn: any, idx: number) => {
      const innNumber = inn.inningsNumber || idx + 1;
      const batters = Array.isArray(inn.batters) ? inn.batters : [];
      const bowlers = Array.isArray(inn.bowlers) ? inn.bowlers : [];
      const extras = inn.extras || {};

      // 1. Batting Runs vs Total
      const battingRuns = batters.reduce((acc: number, b: any) => acc + (Number(b.runs) || 0), 0);
      const totalExtras = Number(extras.total ?? (
        (Number(extras.wides) || 0) +
        (Number(extras.noBalls) || 0) +
        (Number(extras.byes) || 0) +
        (Number(extras.legByes) || 0) +
        (Number(extras.penalty) || 0)
      ));
      const calculatedTotalRuns = battingRuns + totalExtras;

      if (inn.total && typeof inn.total.runs === 'number' && inn.total.runs > 0) {
        if (inn.total.runs !== calculatedTotalRuns) {
          warnings.push(
            `Innings ${innNumber}: Recorded total runs (${inn.total.runs}) differs from Batting sum (${battingRuns}) + Extras (${totalExtras}) = ${calculatedTotalRuns}`
          );
          uncertainFields.push(`innings[${idx}].total.runs`);
          confidenceDeductions += 0.1;
        }
      } else {
        // Auto-fill total runs if missing or 0
        inn.total = inn.total || {};
        inn.total.runs = calculatedTotalRuns;
      }

      // 2. Dismissals vs Total Wickets
      const dismissedBatters = batters.filter((b: any) => {
        const s = (b.dismissalStatus || b.outStatus || '').toLowerCase();
        return s && !['not_out', 'not out', 'dnb', 'did not bat', 'retired hurt'].includes(s);
      }).length;

      const bowlerWickets = bowlers.reduce((acc: number, bw: any) => acc + (Number(bw.wickets) || 0), 0);

      if (inn.total && typeof inn.total.wickets === 'number') {
        if (inn.total.wickets < bowlerWickets) {
          warnings.push(
            `Innings ${innNumber}: Bowler wickets (${bowlerWickets}) exceed total team wickets (${inn.total.wickets})`
          );
          uncertainFields.push(`innings[${idx}].total.wickets`);
          confidenceDeductions += 0.1;
        }
        if (dismissedBatters > 0 && Math.abs(dismissedBatters - inn.total.wickets) > 1) {
          warnings.push(
            `Innings ${innNumber}: Dismissed batters count (${dismissedBatters}) differs from team wickets (${inn.total.wickets})`
          );
          uncertainFields.push(`innings[${idx}].batters.dismissals`);
          confidenceDeductions += 0.05;
        }
      } else {
        inn.total = inn.total || {};
        inn.total.wickets = dismissedBatters || bowlerWickets;
      }

      // 3. Overs & Balls validation
      const bowlerBalls = bowlers.reduce((acc: number, bw: any) => acc + this.oversToBalls(Number(bw.overs) || 0), 0);
      const innOvers = Number(inn.total?.overs) || 0;
      const innBalls = this.oversToBalls(innOvers);

      if (innBalls > 0 && bowlerBalls > 0 && Math.abs(innBalls - bowlerBalls) > 6) {
        warnings.push(
          `Innings ${innNumber}: Sum of overs bowled by bowlers (${(bowlerBalls / 6).toFixed(1)}) does not match innings overs (${innOvers})`
        );
        uncertainFields.push(`innings[${idx}].total.overs`);
        confidenceDeductions += 0.05;
      }

      // 4. Batting Strike Rates Check
      batters.forEach((b: any, bIdx: number) => {
        if (b.balls && Number(b.balls) > 0 && typeof b.strikeRate === 'number') {
          const expectedSR = ((Number(b.runs) || 0) / Number(b.balls)) * 100;
          if (Math.abs(expectedSR - b.strikeRate) > 5) {
            uncertainFields.push(`innings[${idx}].batters[${bIdx}].strikeRate`);
          }
        }
      });
    });

    const calculatedConfidence = Math.max(0.2, Math.min(1.0, 1.0 - confidenceDeductions));

    return {
      isValid: warnings.length === 0,
      scorecardConfidence: Math.round(calculatedConfidence * 100) / 100,
      warnings,
      uncertainFields: Array.from(new Set(uncertainFields))
    };
  }
}

export default ScorecardValidationService;
