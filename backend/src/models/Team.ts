import { Schema, model } from 'mongoose';
import { ITeam } from '../types';

const TeamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      unique: true,
      trim: true,
      index: true,
    },
    logo: {
      type: String,
      default: '',
    },
    players: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Player',
      },
    ],
    stats: {
      matches: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      points: { type: Number, default: 0 },
      nrr: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

export const Team = model<ITeam>('Team', TeamSchema);
