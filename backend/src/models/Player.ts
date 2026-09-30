import { Schema, model } from 'mongoose';
import { IPlayer } from '../types';

const PlayerSchema = new Schema<IPlayer>(
  {
    name: {
      type: String,
      required: [true, 'Player name is required'],
      trim: true,
      index: true,
    },
    fullName: {
      type: String,
      default: '',
      trim: true,
    },
    country: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    nationalTeamId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    iplTeamId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    aliases: {
      type: [String],
      default: [],
      index: true,
    },
    profilePic: {
      type: String,
      default: '',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

PlayerSchema.index({ name: 1, createdBy: 1 });

export const Player = model<IPlayer>('Player', PlayerSchema);
