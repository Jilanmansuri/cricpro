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
    aliases: {
      type: [String],
      default: [],
      index: true,
    },
    profilePic: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const Player = model<IPlayer>('Player', PlayerSchema);
