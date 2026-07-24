import { Schema, model } from 'mongoose';
import { IVenue } from '../types';

const VenueSchema = new Schema<IVenue>(
  {
    name: {
      type: String,
      required: [true, 'Venue name is required'],
      unique: true,
      trim: true,
      index: true,
    },
    location: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const Venue = model<IVenue>('Venue', VenueSchema);
