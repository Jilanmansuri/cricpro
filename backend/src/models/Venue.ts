import { Schema, model } from 'mongoose';
import { IVenue } from '../types';

const VenueSchema = new Schema<IVenue>(
  {
    name: {
      type: String,
      required: [true, 'Venue name is required'],
      trim: true,
      index: true,
    },
    location: {
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

VenueSchema.index({ name: 1, createdBy: 1 });

export const Venue = model<IVenue>('Venue', VenueSchema);
