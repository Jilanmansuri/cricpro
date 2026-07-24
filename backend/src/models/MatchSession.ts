import { Schema, model, Document } from 'mongoose';

export interface IMatchSession extends Document {
  step1: any; // Team A Batting
  step2: any; // Team B Bowling
  step3: any; // Team B Batting
  step4: any; // Team A Bowling
  mergedPayload: any;
  createdAt: Date;
}

const MatchSessionSchema = new Schema<IMatchSession>(
  {
    step1: { type: Schema.Types.Mixed, default: null },
    step2: { type: Schema.Types.Mixed, default: null },
    step3: { type: Schema.Types.Mixed, default: null },
    step4: { type: Schema.Types.Mixed, default: null },
    mergedPayload: { type: Schema.Types.Mixed, default: null },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 21600, // Expires after 6 hours (21600 seconds)
    },
  },
  {
    timestamps: true,
  }
);

export const MatchSession = model<IMatchSession>('MatchSession', MatchSessionSchema);
