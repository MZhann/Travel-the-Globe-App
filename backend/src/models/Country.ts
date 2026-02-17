import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICountry {
  name: string;
  iso2: string;
  iso3: string;
  region?: string;
  subregion?: string;
}

export interface ICountryDoc extends ICountry, Document {}

const countrySchema = new Schema<ICountryDoc>(
  {
    name: { type: String, required: true },
    iso2: { type: String, required: true, unique: true },
    iso3: { type: String, required: true },
    region: String,
    subregion: String,
  },
  { timestamps: true }
);

const Country: Model<ICountryDoc> =
  mongoose.models.Country ?? mongoose.model<ICountryDoc>('Country', countrySchema);

export default Country;
