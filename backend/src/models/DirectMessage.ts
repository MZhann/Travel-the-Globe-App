import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDirectMessage {
  senderId: string;
  recipientId: string;
  message: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDirectMessageDoc extends IDirectMessage, Document {}

const directMessageSchema = new Schema<IDirectMessageDoc>(
  {
    senderId: { type: String, required: true, index: true },
    recipientId: { type: String, required: true, index: true },
    message: { type: String, required: true, maxlength: 2000 },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Compound index for conversation lookups (both directions)
directMessageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
directMessageSchema.index({ recipientId: 1, senderId: 1, createdAt: -1 });

// Auto-delete messages older than 1 year to keep the DB tidy
directMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 3600 });

const DirectMessage: Model<IDirectMessageDoc> =
  mongoose.models.DirectMessage ??
  mongoose.model<IDirectMessageDoc>('DirectMessage', directMessageSchema);

export default DirectMessage;
