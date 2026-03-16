import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChatMessage {
  userId: string;
  displayName: string;
  message: string;
  createdAt: Date;
}

export interface IChatMessageDoc extends IChatMessage, Document {}

const chatMessageSchema = new Schema<IChatMessageDoc>(
  {
    userId: { type: String, required: true, index: true },
    displayName: { type: String, required: true },
    message: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true }
);

chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

const ChatMessage: Model<IChatMessageDoc> =
  mongoose.models.ChatMessage ??
  mongoose.model<IChatMessageDoc>('ChatMessage', chatMessageSchema);

export default ChatMessage;
