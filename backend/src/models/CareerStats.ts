import { Schema, model } from 'mongoose';
import { ICareerStats } from '../types';

const CareerStatsSchema = new Schema<ICareerStats>(
  {
    playerId: {
      type: Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
      unique: true,
      index: true,
    },
    playerName: {
      type: String,
      index: true,
    },
    batting: {
      matches: { type: Number, default: 0 },
      runs: { type: Number, default: 0 },
      balls: { type: Number, default: 0 },
      fours: { type: Number, default: 0 },
      sixes: { type: Number, default: 0 },
      fifties: { type: Number, default: 0 },
      hundreds: { type: Number, default: 0 },
      ducks: { type: Number, default: 0 },
      highestScore: { type: Number, default: 0 },
      notOuts: { type: Number, default: 0 },
    },
    bowling: {
      overs: { type: Number, default: 0 },
      maidens: { type: Number, default: 0 },
      runsConceded: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      bestBowling: {
        wickets: { type: Number, default: 0 },
        runs: { type: Number, default: 0 },
      },
    },
    fielding: {
      catches: { type: Number, default: 0 },
      stumpings: { type: Number, default: 0 },
      runOuts: { type: Number, default: 0 },
    },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    mvps: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const CareerStats = model<ICareerStats>('CareerStats', CareerStatsSchema);
