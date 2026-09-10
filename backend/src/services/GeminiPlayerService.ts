import { GoogleGenAI } from '@google/genai';
import { Player } from '../models/Player';
import { Team } from '../models/Team';

export interface EnrichedPlayerInfo {
  query: string;
  fullName: string;
  country: string;
  nationalTeamId: string;
  iplTeamId?: string | null;
}

// Fallback registry for ultra-fast response and reliability
const KNOWN_CRICKET_PLAYERS: Record<string, { fullName: string; country: string; nationalTeamId: string; iplTeamId?: string | null }> = {
  'a sharma': { fullName: 'Abhishek Sharma', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_SRH' },
  'abhishek sharma': { fullName: 'Abhishek Sharma', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_SRH' },
  's yadav': { fullName: 'Suryakumar Yadav', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_MI' },
  'suryakumar yadav': { fullName: 'Suryakumar Yadav', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_MI' },
  's samson': { fullName: 'Sanju Samson', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_RR' },
  'sanju samson': { fullName: 'Sanju Samson', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_RR' },
  's gill': { fullName: 'Shubman Gill', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_GT' },
  'shubman gill': { fullName: 'Shubman Gill', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_GT' },
  'r gaikwad': { fullName: 'Ruturaj Gaikwad', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_CSK' },
  'ruturaj gaikwad': { fullName: 'Ruturaj Gaikwad', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_CSK' },
  'h pandya': { fullName: 'Hardik Pandya', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_MI' },
  'hardik pandya': { fullName: 'Hardik Pandya', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_MI' },
  'a patel': { fullName: 'Axar Patel', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_DC' },
  'axar patel': { fullName: 'Axar Patel', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_DC' },
  'arshdeep': { fullName: 'Arshdeep Singh', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_PBKS' },
  'arshdeep singh': { fullName: 'Arshdeep Singh', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_PBKS' },
  'j bumrah': { fullName: 'Jasprit Bumrah', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_MI' },
  'jasprit bumrah': { fullName: 'Jasprit Bumrah', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_MI' },
  'm siraj': { fullName: 'Mohammed Siraj', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_RCB' },
  'mohammed siraj': { fullName: 'Mohammed Siraj', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_RCB' },
  'r sharma': { fullName: 'Rohit Sharma', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_MI' },
  'rohit sharma': { fullName: 'Rohit Sharma', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_MI' },
  'v kohli': { fullName: 'Virat Kohli', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_RCB' },
  'virat kohli': { fullName: 'Virat Kohli', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_RCB' },
  'kl rahul': { fullName: 'KL Rahul', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_DC' },
  'r pant': { fullName: 'Rishabh Pant', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_LSG' },
  'rishabh pant': { fullName: 'Rishabh Pant', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_LSG' },
  'k yadav': { fullName: 'Kuldeep Yadav', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_DC' },
  'kuldeep yadav': { fullName: 'Kuldeep Yadav', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_DC' },
  'y chahal': { fullName: 'Yuzvendra Chahal', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_PBKS' },
  's dube': { fullName: 'Shivam Dube', country: 'India', nationalTeamId: 'INT_IND', iplTeamId: 'IPL_CSK' },
  't head': { fullName: 'Travis Head', country: 'Australia', nationalTeamId: 'INT_AUS', iplTeamId: 'IPL_SRH' },
  'travis head': { fullName: 'Travis Head', country: 'Australia', nationalTeamId: 'INT_AUS', iplTeamId: 'IPL_SRH' },
  'p cummins': { fullName: 'Pat Cummins', country: 'Australia', nationalTeamId: 'INT_AUS', iplTeamId: 'IPL_SRH' },
  'm starc': { fullName: 'Mitchell Starc', country: 'Australia', nationalTeamId: 'INT_AUS', iplTeamId: 'IPL_DC' },
  'g maxwell': { fullName: 'Glenn Maxwell', country: 'Australia', nationalTeamId: 'INT_AUS', iplTeamId: 'IPL_PBKS' },
  'd warner': { fullName: 'David Warner', country: 'Australia', nationalTeamId: 'INT_AUS', iplTeamId: null },
  's smith': { fullName: 'Steve Smith', country: 'Australia', nationalTeamId: 'INT_AUS', iplTeamId: null },
  't ferreira': { fullName: 'Tristan Ferreira', country: 'South Africa', nationalTeamId: 'INT_RSA', iplTeamId: null },
  'h klaasen': { fullName: 'Heinrich Klaasen', country: 'South Africa', nationalTeamId: 'INT_RSA', iplTeamId: 'IPL_SRH' },
  'q de kock': { fullName: 'Quinton de Kock', country: 'South Africa', nationalTeamId: 'INT_RSA', iplTeamId: 'IPL_KKR' },
  'k rabada': { fullName: 'Kagiso Rabada', country: 'South Africa', nationalTeamId: 'INT_RSA', iplTeamId: 'IPL_GT' },
  'j buttler': { fullName: 'Jos Buttler', country: 'England', nationalTeamId: 'INT_ENG', iplTeamId: 'IPL_GT' },
  'b stokes': { fullName: 'Ben Stokes', country: 'England', nationalTeamId: 'INT_ENG', iplTeamId: null },
  'b azam': { fullName: 'Babar Azam', country: 'Pakistan', nationalTeamId: 'INT_PAK', iplTeamId: null },
  's afridi': { fullName: 'Shaheen Afridi', country: 'Pakistan', nationalTeamId: 'INT_PAK', iplTeamId: null },
  'k williamson': { fullName: 'Kane Williamson', country: 'New Zealand', nationalTeamId: 'INT_NZL', iplTeamId: null },
  'r ravindra': { fullName: 'Rachin Ravindra', country: 'New Zealand', nationalTeamId: 'INT_NZL', iplTeamId: 'IPL_CSK' },
};

export class GeminiPlayerService {
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

  /**
   * Intelligently resolves player names into country, international team ID and IPL franchise ID using Gemini.
   */
  public async resolvePlayers(playerNames: string[]): Promise<Map<string, EnrichedPlayerInfo>> {
    const resultMap = new Map<string, EnrichedPlayerInfo>();
    const neededFromGemini: string[] = [];

    // 1. Check known fast registry first
    for (const name of playerNames) {
      if (!name || !name.trim()) continue;
      const cleanKey = name.trim().toLowerCase();
      if (KNOWN_CRICKET_PLAYERS[cleanKey]) {
        const found = KNOWN_CRICKET_PLAYERS[cleanKey];
        resultMap.set(cleanKey, {
          query: name,
          fullName: found.fullName,
          country: found.country,
          nationalTeamId: found.nationalTeamId,
          iplTeamId: found.iplTeamId
        });
      } else {
        neededFromGemini.push(name.trim());
      }
    }

    if (neededFromGemini.length === 0) {
      return resultMap;
    }

    // 2. Query Gemini for the remaining players
    if (this.ai && neededFromGemini.length > 0) {
      try {
        const uniqueNames = Array.from(new Set(neededFromGemini));
        const prompt = `You are an expert cricket intelligence engine for CricPro.
Identify the real-world cricket country, national team ID, and IPL franchise ID for each player.
Supported nationalTeamId format: INT_IND (India), INT_AUS (Australia), INT_ENG (England), INT_RSA (South Africa), INT_PAK (Pakistan), INT_NZL (New Zealand), INT_BAN (Bangladesh), INT_SL (Sri Lanka), INT_AFG (Afghanistan), INT_WI (West Indies), INT_ZIM (Zimbabwe), INT_IRE (Ireland), etc.
Supported iplTeamId format: IPL_CSK, IPL_MI, IPL_RCB, IPL_KKR, IPL_DC, IPL_GT, IPL_RR, IPL_SRH, IPL_LSG, IPL_PBKS, or null.

Players to identify:
${JSON.stringify(uniqueNames)}

Return ONLY a valid JSON object strictly matching this schema with NO markdown and NO explanations:
{
  "players": [
    {
      "query": "A Sharma",
      "fullName": "Abhishek Sharma",
      "country": "India",
      "nationalTeamId": "INT_IND",
      "iplTeamId": "IPL_SRH"
    }
  ]
}`;

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
        });

        const rawText = (response.text || '').trim();
        const jsonText = rawText.replace(/^```(json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(jsonText);

        if (parsed && Array.isArray(parsed.players)) {
          for (const p of parsed.players) {
            const key = (p.query || '').toLowerCase().trim();
            if (key) {
              resultMap.set(key, {
                query: p.query,
                fullName: p.fullName || p.query,
                country: p.country || 'India',
                nationalTeamId: p.nationalTeamId || 'INT_IND',
                iplTeamId: p.iplTeamId || null
              });
            }
          }
        }
      } catch (err: any) {
        console.warn('[GeminiPlayerService] Gemini query error:', err.message);
      }
    }

    return resultMap;
  }

  /**
   * Enriches player records in DB and links them to their true national team.
   */
  public async enrichAndSyncPlayer(playerName: string, playerDoc?: any): Promise<EnrichedPlayerInfo | null> {
    const resMap = await this.resolvePlayers([playerName]);
    const info = resMap.get(playerName.toLowerCase().trim());
    if (!info) return null;

    try {
      const doc = playerDoc || await Player.findOne({ name: { $regex: new RegExp(`^${playerName.trim()}$`, 'i') } });
      if (doc) {
        doc.country = info.country;
        doc.nationalTeamId = info.nationalTeamId;
        doc.fullName = info.fullName;
        if (info.iplTeamId) doc.iplTeamId = info.iplTeamId;
        await doc.save();

        // Add player to the real national team's player roster
        if (info.nationalTeamId) {
          const natTeam = await Team.findOne({ teamId: info.nationalTeamId });
          if (natTeam) {
            if (!natTeam.players.some(id => id.toString() === doc._id.toString())) {
              natTeam.players.push(doc._id);
              await natTeam.save();
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('[GeminiPlayerService] Failed to sync player to DB:', err.message);
    }

    return info;
  }
}

export const geminiPlayerService = new GeminiPlayerService();