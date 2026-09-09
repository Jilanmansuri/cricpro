import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  profilePic?: string;
  phone?: string;
  role: 'admin' | 'manager' | 'player';
  status: 'active' | 'inactive';
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

export interface ICareerStats extends Document {
  playerId: Types.ObjectId;
  playerName?: string;
  batting: {
    matches: number;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    fifties: number;
    hundreds: number;
    ducks: number;
    highestScore: number;
    notOuts: number;
  };
  bowling: {
    overs: number;
    maidens: number;
    runsConceded: number;
    wickets: number;
    bestBowling: {
      wickets: number;
      runs: number;
    };
  };
  fielding: {
    catches: number;
    stumpings: number;
    runOuts: number;
  };
  wins: number;
  losses: number;
  mvps: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlayer extends Document {
  name: string;
  aliases: string[];
  profilePic?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITeam extends Document {
  teamId?: string;
  officialName?: string;
  displayName?: string;
  shortName?: string;
  abbreviation?: string;
  aliases?: string[];
  teamType?: 'international' | 'franchise' | 'domestic' | 'club' | 'other';
  country?: string;
  league?: string;
  logo?: string;
  logoUrl?: string;
  isActive?: boolean;
  name: string;
  players: Types.ObjectId[];
  stats: {
    matches: number;
    wins: number;
    losses: number;
    points: number;
    nrr: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ITournament extends Document {
  name: string;
  startDate: Date;
  endDate: Date;
  organizer: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITournamentTeam extends Document {
  tournamentId: Types.ObjectId;
  teamId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPointsTable extends Document {
  tournamentId: Types.ObjectId;
  teamId: Types.ObjectId;
  played: number;
  won: number;
  lost: number;
  tied: number;
  nrr: number;
  points: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVenue extends Document {
  name: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMatch extends Document {
  tournamentId?: Types.ObjectId;
  venueId: Types.ObjectId;
  date: Date;
  overs: number;
  teamA: Types.ObjectId;
  teamB: Types.ObjectId;
  teamAScore: {
    runs: number;
    wickets: number;
    overs: number;
  };
  teamBScore: {
    runs: number;
    wickets: number;
    overs: number;
  };
  result: string;
  mvp?: Types.ObjectId;
  scorecardUrl?: string;
  ocrConfidence?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlayerMatchStats extends Document {
  matchId: Types.ObjectId;
  playerId: Types.ObjectId;
  playerName?: string;
  teamId: Types.ObjectId;
  batting: {
    didNotBat: boolean;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    outStatus: string;
  };
  bowling: {
    didNotBowl: boolean;
    overs: number;
    maidens: number;
    runsConceded: number;
    wickets: number;
  };
  fielding: {
    catches: number;
    stumpings: number;
    runOuts: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlayerAlias extends Document {
  playerId: Types.ObjectId;
  alias: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAward extends Document {
  tournamentId: Types.ObjectId;
  awardType: 'orange_cap' | 'purple_cap' | 'mvp';
  playerId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotification extends Document {
  userId: Types.ObjectId;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IActivityLog extends Document {
  userId: Types.ObjectId;
  action: string;
  details: string;
  timestamp: Date;
}

export interface IImage extends Document {
  url: string;
  publicId: string;
  createdAt: Date;
  updatedAt: Date;
}
