import mongoose, { Document, Schema } from "mongoose";

export interface IFarcasterNotificationToken extends Document {
  token: string;
  notificationUrl?: string;
  fid?: number;
  lastEvent: string;
  enabled: boolean;
  lastPayload?: Record<string, unknown>;
  jfsHeader?: string;
  jfsPayload?: string;
  jfsSignature?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FarcasterNotificationTokenSchema = new Schema<IFarcasterNotificationToken>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    notificationUrl: {
      type: String,
      required: false,
    },
    fid: {
      type: Number,
      required: false,
      index: true,
    },
    lastEvent: {
      type: String,
      required: true,
    },
    enabled: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    lastPayload: {
      type: Schema.Types.Mixed,
      required: false,
    },
    jfsHeader: {
      type: String,
      required: false,
    },
    jfsPayload: {
      type: String,
      required: false,
    },
    jfsSignature: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

FarcasterNotificationTokenSchema.index({ fid: 1, enabled: 1 });

export const FarcasterNotificationToken =
  mongoose.models.FarcasterNotificationToken ||
  mongoose.model<IFarcasterNotificationToken>(
    "FarcasterNotificationToken",
    FarcasterNotificationTokenSchema
  );
