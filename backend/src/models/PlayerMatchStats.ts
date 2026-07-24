import { Schema, model } from 'mongoose';
import { IPlayerMatchStats } from '../types';

const PlayerMatchStatsSchema = new Schema<IPlayerMatchStats>(
  {
    matchId: {
      type: Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
      index: true,
    },
    playerId: {
      type: Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
      index: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    batting: {
      didNotBat: { type: Boolean, default: false },
      runs: { type: Number, default: 0 },
      balls: { type: Number, default: 0 },
      fours: { type: Number, default: 0 },
      sixes: { type: Number, default: 0 },
      outStatus: { type: String, default: 'not_out' },
    },
    bowling: {
      didNotBowl: { type: Boolean, default: false },
      overs: { type: Number, default: 0 },
      maidens: { type: Number, default: 0 },
      runsConceded: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
    },
    fielding: {
      catches: { type: Number, default: 0 },
      stumpings: { type: Number, default: 0 },
      runOuts: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

export const PlayerMatchStats = model<IPlayerMatchStats>('PlayerMatchStats', PlayerMatchStatsSchema);
