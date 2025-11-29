import mongoose, { Schema, Document } from 'mongoose';
import { PaymentType } from '../types/payment';

export interface IPayment extends Document {
  walletAddress: string;
  paymentType: PaymentType;
  transactionHash: string;
  amount: string;
  chainId: number;
  recipient: string;
  verified: boolean;
  createdAt: Date;
  expiresAt?: Date;
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
    enum: Object.values(PaymentType),
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
});

// Index for efficient queries
PaymentSchema.index({ walletAddress: 1, paymentType: 1 });
PaymentSchema.index({ transactionHash: 1 });
PaymentSchema.index({ expiresAt: 1 });

export const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);