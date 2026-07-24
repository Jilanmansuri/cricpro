import { create } from 'zustand';

interface OcrMatchInfo {
  teamA: string;
  teamB: string;
  teamAScore: { runs: number; wickets: number; overs: number };
  teamBScore: { runs: number; wickets: number; overs: number };
  date: string;
  venue: string;
  result: string;
  overs: number;
  mvp?: string;
}

interface OcrBattingRow {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  outStatus: string;
  confidence: number;
}

interface OcrBowlingRow {
  name: string;
  overs: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  confidence: number;
}

interface OcrScorecardState {
  scorecardUrl: string | null;
  ocrConfidence: number;
  matchInfo: OcrMatchInfo;
  teamABatting: OcrBattingRow[];
  teamABowling: OcrBowlingRow[];
  teamBBatting: OcrBattingRow[];
  teamBBowling: OcrBowlingRow[];
  uncertainFields: string[];
  setOcrData: (data: any) => void;
  updateMatchInfo: (info: Partial<OcrMatchInfo>) => void;
  updateBattingRow: (team: 'A' | 'B', index: number, updatedRow: Partial<OcrBattingRow>) => void;
  updateBowlingRow: (team: 'A' | 'B', index: number, updatedRow: Partial<OcrBowlingRow>) => void;
  clearOcrData: () => void;
}

export const useMatchStore = create<OcrScorecardState>((set) => ({
  scorecardUrl: null,
  ocrConfidence: 1.0,
  matchInfo: {
    teamA: '',
    teamB: '',
    teamAScore: { runs: 0, wickets: 0, overs: 0 },
    teamBScore: { runs: 0, wickets: 0, overs: 0 },
    date: '',
    venue: '',
    result: '',
    overs: 20,
    mvp: '',
  },
  teamABatting: [],
  teamABowling: [],
  teamBBatting: [],
  teamBBowling: [],
  uncertainFields: [],

  setOcrData: (data) => set({
    scorecardUrl: data.scorecardUrl,
    ocrConfidence: data.ocrConfidence,
    matchInfo: data.matchInfo,
    teamABatting: data.teamABatting,
    teamABowling: data.teamABowling,
    teamBBatting: data.teamBBatting,
    teamBBowling: data.teamBBowling,
    uncertainFields: data.uncertainFields || []
  }),

  updateMatchInfo: (info) => set((state) => ({
    matchInfo: { ...state.matchInfo, ...info }
  })),

  updateBattingRow: (team, index, updatedRow) => set((state) => {
    const listName = team === 'A' ? 'teamABatting' : 'teamBBatting';
    const list = [...state[listName]];
    list[index] = { ...list[index], ...updatedRow };
    return { [listName]: list };
  }),

  updateBowlingRow: (team, index, updatedRow) => set((state) => {
    const listName = team === 'A' ? 'teamABowling' : 'teamBBowling';
    const list = [...state[listName]];
    list[index] = { ...list[index], ...updatedRow };
    return { [listName]: list };
  }),

  clearOcrData: () => set({
    scorecardUrl: null,
    ocrConfidence: 1.0,
    matchInfo: {
      teamA: '',
      teamB: '',
      teamAScore: { runs: 0, wickets: 0, overs: 0 },
      teamBScore: { runs: 0, wickets: 0, overs: 0 },
      date: '',
      venue: '',
      result: '',
      overs: 20,
      mvp: '',
    },
    teamABatting: [],
    teamABowling: [],
    teamBBatting: [],
    teamBBowling: [],
    uncertainFields: []
  }),
}));
