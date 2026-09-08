import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

export interface StructuredScorecardData {
  match: {
    teams: string[];
    teamA: string;
    teamB: string;
    date: string | null;
    venue: string | null;
    competition: string | null;
    format: string | null;
    matchType: string | null;
    overs: number;
    toss?: {
      winner: string | null;
      decision: string | null;
    };
    result?: {
      winner: string | null;
      text: string | null;
      margin: string | null;
    };
    playerOfMatch?: string | null;
  };
  innings: Array<{
    inningsNumber: number;
    battingTeam: string;
    bowlingTeam: string;
    total: {
      runs: number;
      wickets: number;
      overs: number;
    };
    batters: Array<{
      name: string;
      runs: number;
      balls: number;
      fours: number;
      sixes: number;
      strikeRate?: number;
      dismissalStatus: string; // 'out' | 'not_out' | 'dnb' | 'retired_hurt'
      dismissalText?: string;
      dismissalType?: string;
      bowler?: string | null;
      fielder?: string | null;
      battingPosition?: number;
    }>;
    bowlers: Array<{
      name: string;
      overs: number;
      maidens: number;
      runsConceded: number;
      wickets: number;
      economy?: number;
      wides?: number;
      noBalls?: number;
    }>;
    extras?: {
      wides?: number;
      noBalls?: number;
      byes?: number;
      legByes?: number;
      penalty?: number;
      total: number;
    };
    fallOfWickets?: Array<{
      wicketNumber: number;
      score: number;
      over?: number;
      batter?: string;
    }>;
    partnerships?: Array<{
      wicketNumber?: number;
      batter1?: string;
      batter2?: string;
      runs: number;
      balls?: number;
    }>;
  }>;
}

export class GeminiExtractionService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  public isAvailable(): boolean {
    return !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  }

  public async extractScorecardFromImage(filePathOrPaths: string | string[]): Promise<StructuredScorecardData> {
    if (!this.ai) {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured in backend environment.');
      }
      this.ai = new GoogleGenAI({ apiKey });
    }

    const filePaths = Array.isArray(filePathOrPaths) ? filePathOrPaths : [filePathOrPaths];
    const imageParts: any[] = [];

    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) {
        continue;
      }
      const ext = path.extname(filePath).toLowerCase();
      let mimeType = 'image/jpeg';
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.gif') mimeType = 'image/gif';

      const imageBytes = fs.readFileSync(filePath);
      const base64Data = imageBytes.toString('base64');
      imageParts.push({
        inlineData: {
          mimeType,
          data: base64Data
        }
      });
    }

    if (imageParts.length === 0) {
      throw new Error(`None of the provided scorecard image files were found.`);
    }

    const prompt = `You are an expert cricket statistician and computer vision analyst for the CricPro application.
You are provided with ${imageParts.length} cricket scorecard image(s) from the same match (for example, Innings 1 scorecard, Innings 2 scorecard, bowling figures, extras, or match summary).
Analyze all provided scorecard images carefully and merge/synthesize them into ONE unified, complete, high-precision match JSON structure.

CRITICAL INSTRUCTIONS:
1. Return ONLY a valid JSON object without any markdown code fence, without \`\`\`json, and without any explanatory text.
2. Adhere strictly to this JSON structure:
{
  "match": {
    "teams": ["Team A Name", "Team B Name"],
    "teamA": "Team A Name",
    "teamB": "Team B Name",
    "date": "YYYY-MM-DD or null",
    "venue": "Venue name or null",
    "competition": "Tournament or series name or null",
    "format": "T20, ODI, Test, or other format or null",
    "matchType": "T20, ODI, Test, or other format or null",
    "overs": 20,
    "toss": {
      "winner": "Toss winner team name or null",
      "decision": "bat or bowl or null"
    },
    "result": {
      "winner": "Winning team name or null",
      "text": "e.g. India won by 6 runs or null",
      "margin": "e.g. 6 runs or 4 wickets or null"
    },
    "playerOfMatch": "Player of the match name or null"
  },
  "innings": [
    {
      "inningsNumber": 1,
      "battingTeam": "Team A Name",
      "bowlingTeam": "Team B Name",
      "total": {
        "runs": 180,
        "wickets": 5,
        "overs": 20.0
      },
      "batters": [
        {
          "name": "Player Name",
          "runs": 45,
          "balls": 30,
          "fours": 4,
          "sixes": 2,
          "strikeRate": 150.0,
          "dismissalStatus": "out", // must be 'out', 'not_out', 'dnb', or 'retired_hurt'
          "dismissalText": "c Fielder b Bowler",
          "dismissalType": "caught", // 'caught', 'bowled', 'lbw', 'run_out', 'stumped', 'not_out'
          "bowler": "Bowler Name or null",
          "fielder": "Fielder Name or null",
          "battingPosition": 1
        }
      ],
      "bowlers": [
        {
          "name": "Bowler Name",
          "overs": 4.0,
          "maidens": 0,
          "runsConceded": 28,
          "wickets": 2,
          "economy": 7.0,
          "wides": 1,
          "noBalls": 0
        }
      ],
      "extras": {
        "wides": 2,
        "noBalls": 1,
        "byes": 0,
        "legByes": 1,
        "penalty": 0,
        "total": 4
      },
      "fallOfWickets": [
        {
          "wicketNumber": 1,
          "score": 30,
          "over": 4.2,
          "batter": "Player Name"
        }
      ],
      "partnerships": []
    }
  ]
}

SPECIFIC CRICKET EXTRACTION & COLUMN ACCURACY RULES:
- BATTERS TABLE COLUMNS:
  * Batter / Batsman: Player's exact name. Remove any captain '(c)' or keeper '(wk)' suffixes into the player name or leave them clean.
  * Dismissal: Look at the text below or beside the name (e.g. 'c Rohit b Bumrah', 'lbw b Shami', 'not out', 'run out').
  * R or Runs: MUST be the exact runs scored.
  * B or Balls: MUST be the exact balls faced. DO NOT swap runs and balls!
  * 4s: Exact count of boundaries (fours).
  * 6s: Exact count of maximums (sixes).
  * SR / Strike Rate: DO NOT confuse Strike Rate (e.g. 150.00) with Runs or Balls!
  * Status: If batter has '*' or 'not out', dismissalStatus MUST be 'not_out'. If marked 'dnb' or did not bat, dismissalStatus MUST be 'dnb'.

- BOWLERS TABLE COLUMNS:
  * Bowler: Player's exact name.
  * O or Overs: Overs bowled (e.g. 4.0, 3.2). In cricket, 3.2 means 3 overs and 2 balls.
  * M or Maidens: Maiden overs (e.g. 0, 1). DO NOT swap Maidens with Wickets!
  * R or Runs: Runs conceded by this bowler.
  * W or Wkts: Wickets taken by this bowler. DO NOT confuse with Maidens or Overs!
  * Econ: Economy rate.

- INNINGS TOTAL & EXTRAS:
  * Sum of all batter runs + Extras total MUST equal the innings total runs.
  * Sum of bowler wickets MUST match batter dismissals (excluding run outs).
  * If both teams/innings are in the images, create inningsNumber 1 for the first batting team, and inningsNumber 2 for the chasing team.
  * DO NOT hallucinate or guess numbers; extract the exact figures displayed on the scorecard.`;

    let responseText = '';
    const generationConfig = {
      responseMimeType: 'application/json',
      temperature: 0.1
    };

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              ...imageParts,
              {
                text: prompt
              }
            ]
          }
        ],
        config: generationConfig
      });
      responseText = response.text || '';
    } catch (primaryError: any) {
      console.warn('[GeminiExtraction] gemini-2.5-flash failed, attempting fallback to gemini-flash-latest:', primaryError.message);
      try {
        const fallbackResponse = await this.ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: [
            {
              role: 'user',
              parts: [
                ...imageParts,
                {
                  text: prompt
                }
              ]
            }
          ],
          config: generationConfig
        });
        responseText = fallbackResponse.text || '';
      } catch (secError: any) {
        console.warn('[GeminiExtraction] gemini-flash-latest failed, attempting fallback to gemini-3.5-flash:', secError.message);
        const tertResponse = await this.ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                ...imageParts,
                {
                  text: prompt
                }
              ]
            }
          ],
          config: generationConfig
        });
        responseText = tertResponse.text || '';
      }
    }

    if (!responseText.trim()) {
      throw new Error('Gemini API returned an empty response');
    }

    // Clean any potential markdown wrapping
    let cleanedJson = responseText.trim();
    if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }

    try {
      const parsed: StructuredScorecardData = JSON.parse(cleanedJson);
      return parsed;
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', responseText);
      throw new Error(`Gemini returned invalid JSON: ${(parseError as Error).message}`);
    }
  }
}

export default GeminiExtractionService;
