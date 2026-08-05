import mongoose, { Schema, Document } from "mongoose";

export interface IBugReport extends Document {
  reportId: string;
  payload: any;
  expiresAt: Date;
  createdAt: Date;
}

const BugReportSchema = new Schema<IBugReport>({
  reportId: { type: String, required: true, unique: true },
  payload: { type: Schema.Types.Mixed, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// TTL index: MongoDB automatically removes reports after they expire.
BugReportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
BugReportSchema.index({ reportId: 1 });

export const BugReport =
  mongoose.models.BugReport ||
  mongoose.model<IBugReport>("BugReport", BugReportSchema);
