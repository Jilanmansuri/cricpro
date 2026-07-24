import { Schema, model } from 'mongoose';
import { ITournament } from '../types';

const TournamentSchema = new Schema<ITournament>(
  {
    name: {
      type: String,
      required: [true, 'Tournament name is required'],
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    organizer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Tournament = model<ITournament>('Tournament', TournamentSchema);
