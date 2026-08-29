import mongoose, { Schema, Document } from "mongoose";

export interface IAdminAction extends Document {
  adminWallet: string;
  action: string;
  params: Record<string, unknown>;
  txHash?: string;
  status: "pending" | "confirmed" | "failed";
  errorMessage?: string;
  createdAt: Date;
}

const AdminActionSchema = new Schema<IAdminAction>({
  adminWallet: {
    type: String,
    required: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
  },
  action: {
    type: String,
    required: true,
  },
  params: {
    type: Schema.Types.Mixed,
    required: true,
  },
  txHash: {
    type: String,
    required: false,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{64}$/,
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "failed"],
    default: "pending",
  },
  errorMessage: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

AdminActionSchema.index({ adminWallet: 1, createdAt: -1 });
AdminActionSchema.index({ action: 1, createdAt: -1 });
AdminActionSchema.index({ status: 1 });

export const AdminAction =
  mongoose.models.AdminAction || mongoose.model<IAdminAction>("AdminAction", AdminActionSchema);
