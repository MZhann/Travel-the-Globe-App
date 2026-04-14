import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITour {
  title: string;
  description: string;
  country: string;
  countryCode: string;
  city: string;
  priceUsd: number;
  durationDays: number;
  type: 'adventure' | 'cultural' | 'beach' | 'nature' | 'city' | 'cruise' | 'food' | 'historical';
  rating: number;
  reviewCount: number;
  imageUrl: string;
  highlights: string[];
  includes: string[];
  provider: string;
  externalUrl: string;
  maxGroupSize: number;
  difficulty: 'easy' | 'moderate' | 'challenging';
  bestSeason: string;
}

export interface ITourDoc extends ITour, Document {}

const tourSchema = new Schema<ITourDoc>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    country: { type: String, required: true },
    countryCode: { type: String, required: true, uppercase: true },
    city: { type: String, required: true },
    priceUsd: { type: Number, required: true },
    durationDays: { type: Number, required: true },
    type: { type: String, required: true, enum: ['adventure', 'cultural', 'beach', 'nature', 'city', 'cruise', 'food', 'historical'] },
    rating: { type: Number, default: 4.5 },
    reviewCount: { type: Number, default: 0 },
    imageUrl: { type: String, default: '' },
    highlights: { type: [String], default: [] },
    includes: { type: [String], default: [] },
    provider: { type: String, required: true },
    externalUrl: { type: String, default: '' },
    maxGroupSize: { type: Number, default: 15 },
    difficulty: { type: String, default: 'moderate', enum: ['easy', 'moderate', 'challenging'] },
    bestSeason: { type: String, default: 'Year-round' },
  },
  { timestamps: true }
);

tourSchema.index({ countryCode: 1 });
tourSchema.index({ type: 1 });
tourSchema.index({ priceUsd: 1 });

const Tour: Model<ITourDoc> =
  mongoose.models.Tour ?? mongoose.model<ITourDoc>('Tour', tourSchema);

export default Tour;
