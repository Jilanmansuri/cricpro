import { Schema, model } from 'mongoose';
import { IPlayerAlias } from '../types';

const PlayerAliasSchema = new Schema<IPlayerAlias>(
  {
    playerId: {
      type: Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
      index: true,
    },
    alias: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const PlayerAlias = model<IPlayerAlias>('PlayerAlias', PlayerAliasSchema);
