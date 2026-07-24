import { Schema, model } from 'mongoose';
import { ITournamentTeam } from '../types';

const TournamentTeamSchema = new Schema<ITournamentTeam>(
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
  },
  {
    timestamps: true,
  }
);

// Ensure a team is registered only once per tournament
TournamentTeamSchema.index({ tournamentId: 1, teamId: 1 }, { unique: true });

export const TournamentTeam = model<ITournamentTeam>('TournamentTeam', TournamentTeamSchema);
