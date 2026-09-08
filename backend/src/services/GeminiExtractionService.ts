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

  public async extractScorecardFromImage(filePath: string): Promise<StructuredScorecardData> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment');
    }

    if (!this.ai) {
      this.ai = new GoogleGenAI({ apiKey });
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`Scorecard image file not found at: ${filePath}`);
    }

    // Determine mime type
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.gif') mimeType = 'image/gif';

    const imageBytes = fs.readFileSync(filePath);
    const base64Data = imageBytes.toString('base64');

    const prompt = `You are an expert cricket statistician and computer vision analyst for the CricPro application.
Analyze this cricket scorecard image carefully and extract all match, innings, batting, bowling, extras, fall of wickets, and result details.

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

SPECIFIC CRICKET RULES:
- Never confuse overs with decimal numbers. In cricket, 4.2 overs means 4 overs and 2 legal balls.
- Extract EVERY batter and bowler visible in the tables.
- If both innings (both teams) are visible in the image, extract both as separate items in the "innings" array.
- In Innings 1, batting team is Team A and bowling team is Team B. In Innings 2, batting team is Team B and bowling team is Team A.
- If a batter did not bat, mark dismissalStatus as "dnb", runs as 0, balls as 0.
- If a batter is not out, mark dismissalStatus as "not_out".
- DO NOT invent or hallucinate missing information; use null when a field is not readable or not present.`;

    let responseText = '';
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data
                }
              },
              {
                text: prompt
              }
            ]
          }
        ]
      });
      responseText = response.text || '';
    } catch (primaryError: any) {
      console.warn('[GeminiExtraction] gemini-2.5-flash failed, attempting fallback to gemini-1.5-flash:', primaryError.message);
      const fallbackResponse = await this.ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data
                }
              },
              {
                text: prompt
              }
            ]
          }
        ]
      });
      responseText = fallbackResponse.text || '';
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
