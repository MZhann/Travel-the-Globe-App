import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITourPlanMessage {
  userId: string;
  displayName: string;
  message: string;
  createdAt: Date;
}

export interface ITourPlan {
  tourId: mongoose.Types.ObjectId;
  creatorId: string;
  title: string;
  status: 'planning' | 'confirmed' | 'cancelled';
  members: string[];
  messages: ITourPlanMessage[];
  plannedDate?: Date;
  notes: string;
}

export interface ITourPlanDoc extends ITourPlan, Document {}

const tourPlanMessageSchema = new Schema<ITourPlanMessage>(
  {
    userId: { type: String, required: true },
    displayName: { type: String, required: true },
    message: { type: String, required: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const tourPlanSchema = new Schema<ITourPlanDoc>(
  {
    tourId: { type: Schema.Types.ObjectId, ref: 'Tour', required: true },
    creatorId: { type: String, required: true },
    title: { type: String, required: true },
    status: { type: String, default: 'planning', enum: ['planning', 'confirmed', 'cancelled'] },
    members: { type: [String], default: [] },
    messages: { type: [tourPlanMessageSchema], default: [] },
    plannedDate: { type: Date },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

tourPlanSchema.index({ creatorId: 1 });
tourPlanSchema.index({ members: 1 });
tourPlanSchema.index({ tourId: 1 });

const TourPlan: Model<ITourPlanDoc> =
  mongoose.models.TourPlan ?? mongoose.model<ITourPlanDoc>('TourPlan', tourPlanSchema);

export default TourPlan;
