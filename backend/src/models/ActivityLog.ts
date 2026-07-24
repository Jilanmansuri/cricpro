import { Schema, model } from 'mongoose';
import { IActivityLog } from '../types';

const ActivityLogSchema = new Schema<IActivityLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  details: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export const ActivityLog = model<IActivityLog>('ActivityLog', ActivityLogSchema);
