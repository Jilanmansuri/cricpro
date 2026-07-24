import { Schema, model } from 'mongoose';
import { IPointsTable } from '../types';

const PointsTableSchema = new Schema<IPointsTable>(
  {
    tournamentId: {
      type: Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
      index: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    played: { type: Number, default: 0 },
    won: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    tied: { type: Number, default: 0 },
    nrr: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

PointsTableSchema.index({ tournamentId: 1, teamId: 1 }, { unique: true });

export const PointsTable = model<IPointsTable>('PointsTable', PointsTableSchema);
