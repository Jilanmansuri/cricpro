import { Schema, model } from 'mongoose';
import { IAward } from '../types';

const AwardSchema = new Schema<IAward>(
  {
    tournamentId: {
      type: Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
      index: true,
    },
    awardType: {
      type: String,
      enum: ['orange_cap', 'purple_cap', 'mvp'],
      required: true,
      index: true,
    },
    playerId: {
      type: Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate award mapping of the same type in the same tournament
AwardSchema.index({ tournamentId: 1, awardType: 1, playerId: 1 }, { unique: true });

export const Award = model<IAward>('Award', AwardSchema);
