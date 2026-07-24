import { Schema, model } from 'mongoose';
import { IMatch } from '../types';

const MatchSchema = new Schema<IMatch>(
  {
    tournamentId: {
      type: Schema.Types.ObjectId,
      ref: 'Tournament',
      index: true,
    },
    venueId: {
      type: Schema.Types.ObjectId,
      ref: 'Venue',
      index: true,
    },
    date: {
      type: Date,
      index: true,
    },
    overs: {
      type: Number,
      required: true,
    },
    teamA: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      index: true,
    },
    teamB: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      index: true,
    },
    teamAScore: {
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      overs: { type: Number, default: 0 },
    },
    teamBScore: {
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      overs: { type: Number, default: 0 },
    },
    result: {
      type: String,
    },
    mvp: {
      type: Schema.Types.ObjectId,
      ref: 'Player',
    },
    scorecardUrl: {
      type: String,
    },
    ocrConfidence: {
      type: Number,
      default: 1.0,
    },
  },
  {
    timestamps: true,
  }
);

export const Match = model<IMatch>('Match', MatchSchema);
