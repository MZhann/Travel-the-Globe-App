import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser {
  email: string;
  salt: string;
  hash: string;
  displayName?: string;
  visitedCountries: string[];
  wishlistCountries: string[];
  albumsPublic: boolean;
  followers: string[];
  following: string[];
}

export interface IUserDoc extends IUser, Document {}

const userSchema = new Schema<IUserDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    salt: { type: String, required: true },
    hash: { type: String, required: true },
    displayName: { type: String, trim: true },
    visitedCountries: { type: [String], default: [] },
    wishlistCountries: { type: [String], default: [] },
    albumsPublic: { type: Boolean, default: false },
    followers: { type: [String], default: [] },
    following: { type: [String], default: [] },
  },
  { timestamps: true }
);

userSchema.index({ 'followers': 1 });
userSchema.index({ 'following': 1 });

const User: Model<IUserDoc> =
  mongoose.models.User ?? mongoose.model<IUserDoc>('User', userSchema);

export default User;
