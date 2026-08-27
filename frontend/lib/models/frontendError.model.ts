import mongoose, { Schema, Document } from "mongoose";

export interface IFrontendError extends Document {
  message: string;
  stack?: string;
  userAddress?: string;
  path?: string;
  action?: string;
  platform: "farcaster" | "minipay" | "others";
  status: "new" | "resolved";
  additionalData?: any;
  createdAt: Date;
}

const FrontendErrorSchema = new Schema<IFrontendError>({
  message: { type: String, required: true },
  stack: { type: String },
  userAddress: { type: String },
  path: { type: String },
  action: { type: String },
  platform: { 
    type: String, 
    enum: ["farcaster", "minipay", "others"], 
    required: true,
    default: "others"
  },
  status: { 
    type: String, 
    enum: ["new", "resolved"], 
    default: "new" 
  },
  additionalData: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

// Index for efficient querying by the admin page
FrontendErrorSchema.index({ status: 1, createdAt: -1 });

export const FrontendError =
  mongoose.models.FrontendError ||
  mongoose.model<IFrontendError>("FrontendError", FrontendErrorSchema);
