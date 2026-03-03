import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ITravelMemory {
  userId: Types.ObjectId;
  countryCode: string;      // ISO-2 code like "US", "FR", "JP"
  imageData: string;        // Base64 encoded image data
  dateTaken: Date;          // Date when photo was taken
  notes: string;            // User's notes/description
  isPublic: boolean;        // Privacy setting
}

export interface ITravelMemoryDoc extends ITravelMemory, Document {
  createdAt: Date;
  updatedAt: Date;
}

const travelMemorySchema = new Schema<ITravelMemoryDoc>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true, 
      index: true 
    },
    countryCode: { 
      type: String, 
      required: true, 
      uppercase: true, 
      trim: true,
      minlength: 2,
      maxlength: 2
    },
    imageData: { 
      type: String, 
      required: true 
    },
    dateTaken: { 
      type: Date, 
      required: true 
    },
    notes: { 
      type: String, 
      default: '',
      maxlength: 1000
    },
    isPublic: { 
      type: Boolean, 
      default: false 
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries
travelMemorySchema.index({ userId: 1, countryCode: 1 });
travelMemorySchema.index({ userId: 1, isPublic: 1 });

const TravelMemory: Model<ITravelMemoryDoc> =
  mongoose.models.TravelMemory ?? mongoose.model<ITravelMemoryDoc>('TravelMemory', travelMemorySchema);

export default TravelMemory;

