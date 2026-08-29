import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
  walletAddress: string;
  paymentType: string;
  transactionHash: string;
  amount: string;
  chainId: number;
  recipient: string;
  verified: boolean;
  createdAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

const PaymentSchema = new Schema<IPayment>({
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
  },
  paymentType: {
    type: String,
    required: true,
  },
  transactionHash: {
    type: String,
    required: true,
    unique: true,
    match: /^0x[a-fA-F0-9]{64}$/,
  },
  amount: {
    type: String,
    required: true,
  },
  chainId: {
    type: Number,
    required: true,
  },
  recipient: {
    type: String,
    required: true,
    lowercase: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: false,
  },
  metadata: {
    type: Schema.Types.Mixed,
    required: false,
  },
});

PaymentSchema.index({ walletAddress: 1, paymentType: 1, expiresAt: 1, transactionHash: 1 });

export const Payment = mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);
