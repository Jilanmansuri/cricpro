export interface PlayerCareerInsights {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export class AiInsightsService {
  public static generatePlayerInsights(career: any): PlayerCareerInsights {
    const { batting, bowling } = career;

    const runs = batting.runs || 0;
    const matches = batting.matches || 0;
    const wickets = bowling.wickets || 0;

    const batAvg = matches - batting.notOuts > 0 
      ? parseFloat((runs / (matches - batting.notOuts)).toFixed(2)) 
      : runs;

    const batSR = batting.balls > 0 
      ? parseFloat(((runs / batting.balls) * 100).toFixed(2)) 
      : 0;

    const bowlEcon = bowling.overs > 0 
      ? parseFloat((bowling.runsConceded / bowling.overs).toFixed(2)) 
      : 0;

    const insights: PlayerCareerInsights = {
      summary: '',
      strengths: [],
      weaknesses: [],
      suggestions: [],
    };

    // 1. Generate Summary
    if (runs > 0 && wickets > 0) {
      insights.summary = `An all-round player with ${runs} runs and ${wickets} wickets across ${matches} matches.`;
    } else if (runs > 0) {
      insights.summary = `A specialist batsman with ${runs} runs and a career average of ${batAvg}.`;
    } else if (wickets > 0) {
      insights.summary = `A key bowler with ${wickets} wickets and a bowling economy of ${bowlEcon}.`;
    } else {
      insights.summary = 'No match stats recorded yet to compile player insights.';
      return insights;
    }

    // 2. Analyze Strengths
    if (batAvg >= 40) {
      insights.strengths.push('Excellent batting average. Serves as a reliable top-order anchor.');
    }
    if (batSR >= 135) {
      insights.strengths.push('High strike rate. Capable of accelerating and scoring quickly in death overs.');
    }
    if (wickets > 0 && bowlEcon < 7.0) {
      insights.strengths.push('Highly economical bowler. Maintains high dot-ball pressure in powerplays.');
    }
    if (bowling.bestBowling?.wickets >= 4) {
      insights.strengths.push('Match-winner. Proven ability to tear through batting lineups (Best: ' + bowling.bestBowling.wickets + '/' + bowling.bestBowling.runs + ').');
    }
    if (insights.strengths.length === 0) {
      insights.strengths.push('Consistent team contributor across match sessions.');
    }

    // 3. Analyze Weaknesses
    if (runs > 0 && batAvg < 20) {
      insights.weaknesses.push('Low batting average. Tends to lose wicket early in innings.');
    }
    if (runs > 0 && batSR < 110) {
      insights.weaknesses.push('Conservative scoring rate. Accumulates too many dot balls during middle overs.');
    }
    if (wickets > 0 && bowlEcon > 9.0) {
      insights.weaknesses.push('Leaky bowling economy. Gives away too many boundaries in pressure situations.');
    }
    if (batting.ducks > 2) {
      insights.weaknesses.push('Prone to ducks. Vulnerable to swing early in the innings.');
    }
    if (insights.weaknesses.length === 0) {
      insights.weaknesses.push('No major weakness identified. Maintain general practice.');
    }

    // 4. Actionable Suggestions
    if (batAvg < 25) {
      insights.suggestions.push('Practice defensive techniques and strike rotation early in the innings.');
    }
    if (batSR < 115) {
      insights.suggestions.push('Develop aerial boundary options and pacing shifts during field changes.');
    }
    if (bowlEcon > 8.5) {
      insights.suggestions.push('Work on slower variations, yorkers, and width adjustments to contain run flows.');
    }
    if (insights.suggestions.length === 0) {
      insights.suggestions.push('Continue regular fitness and net drills to sustain existing peak averages.');
    }

    return insights;
  }
}
export default AiInsightsService;
