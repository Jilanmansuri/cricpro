import { Schema, model } from 'mongoose';
import { ITeam } from '../types';

const TeamSchema = new Schema<ITeam>(
  {
    teamId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    officialName: {
      type: String,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      trim: true,
      index: true,
    },
    shortName: {
      type: String,
      trim: true,
      index: true,
    },
    abbreviation: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },
    aliases: [
      {
        type: String,
        trim: true,
        lowercase: true,
        index: true,
      },
    ],
    teamType: {
      type: String,
      enum: ['international', 'franchise', 'domestic', 'club', 'other'],
      default: 'other',
      index: true,
    },
    country: {
      type: String,
      trim: true,
    },
    league: {
      type: String,
      trim: true,
      index: true,
    },
    logo: {
      type: String,
      default: '',
    },
    logoUrl: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Team name is required'],
      unique: true,
      trim: true,
      index: true,
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

// Backward-compatibility & consistency pre-validate hook
TeamSchema.pre('validate', function (next) {
  if (!this.name) {
    this.name = this.displayName || this.officialName || this.shortName || this.teamId || '';
  }
  if (!this.officialName && this.name) {
    this.officialName = this.name;
  }
  if (!this.displayName && this.name) {
    this.displayName = this.name;
  }
  if (!this.shortName && this.name) {
    this.shortName = this.name;
  }
  if (this.logo && !this.logoUrl) {
    this.logoUrl = this.logo;
  }
  if (this.logoUrl && !this.logo) {
    this.logo = this.logoUrl;
  }
  if (!this.aliases) {
    this.aliases = [];
  }
  next();
});

export const Team = model<ITeam>('Team', TeamSchema);
