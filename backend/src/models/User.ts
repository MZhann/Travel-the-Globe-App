import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser {
  email: string;
  salt: string;
  hash: string;
  displayName?: string;
}

export interface IUserDoc extends IUser, Document {}

const userSchema = new Schema<IUserDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    salt: { type: String, required: true },
    hash: { type: String, required: true },
    displayName: { type: String, trim: true },
  },
  { timestamps: true }
);

const User: Model<IUserDoc> =
  mongoose.models.User ?? mongoose.model<IUserDoc>('User', userSchema);

export default User;
