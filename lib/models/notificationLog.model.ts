import mongoose, { Document, Schema } from "mongoose";

export interface INotificationLog extends Document {
  type: string; // 'daily', 'reminder', 'custom'
  date?: string; // YYYY-MM-DD for daily
  title: string;
  body: string;
  targetUrl: string;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  createdAt: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>(
  {
    type: { type: String, required: true, index: true },
    date: { type: String, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    targetUrl: { type: String, required: true },
    recipientCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Ensure we don't send daily notifications twice for the same day
NotificationLogSchema.index({ type: 1, date: 1 }, { unique: true, partialFilterExpression: { type: 'daily' } });

export const NotificationLog =
  mongoose.models.NotificationLog ||
  mongoose.model<INotificationLog>("NotificationLog", NotificationLogSchema);
