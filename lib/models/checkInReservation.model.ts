import mongoose, { Document, Schema } from "mongoose";

export const CHECKIN_RESERVATION_STATUSES = [
  "pending",
  "earned",
  "claiming",
  "claimed",
  "expired",
  "failed",
] as const;

export type CheckInReservationStatus =
  (typeof CHECKIN_RESERVATION_STATUSES)[number];

export interface ICheckInReservation extends Document {
  walletAddress: string;
  utcDay: number;
  dailyChallengeId: mongoose.Types.ObjectId;
  puzzleId: string;
  status: CheckInReservationStatus;
  rewardEligible: boolean;
  countsTowardSlots: boolean;
  checkInAmountWei: string;
  pendingExpiresAt: Date;
  solvedAt?: Date;
  claimNonce?: string;
  claimDeadline?: number;
  claimSignature?: string;
  claimTxHash?: string;
  claimedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CheckInReservationSchema = new Schema<ICheckInReservation>(
  {
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      match: /^0x[a-fA-F0-9]{40}$/,
    },
    utcDay: {
      type: Number,
      required: true,
    },
    dailyChallengeId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "DailyChallenge",
    },
    puzzleId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: CHECKIN_RESERVATION_STATUSES,
      required: true,
      default: "pending",
    },
    rewardEligible: {
      type: Boolean,
      required: true,
      default: true,
    },
    countsTowardSlots: {
      type: Boolean,
      required: true,
      default: true,
    },
    checkInAmountWei: {
      type: String,
      required: true,
    },
    pendingExpiresAt: {
      type: Date,
      required: true,
    },
    solvedAt: {
      type: Date,
      required: false,
    },
    claimNonce: {
      type: String,
      required: false,
      sparse: true,
      unique: true,
    },
    claimDeadline: {
      type: Number,
      required: false,
    },
    claimSignature: {
      type: String,
      required: false,
    },
    claimTxHash: {
      type: String,
      required: false,
      lowercase: true,
      match: /^0x[a-fA-F0-9]{64}$/,
    },
    claimedAt: {
      type: Date,
      required: false,
    },
    errorMessage: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

CheckInReservationSchema.index({ walletAddress: 1, utcDay: 1 }, { unique: true });
CheckInReservationSchema.index({ utcDay: 1, status: 1 });
CheckInReservationSchema.index({ pendingExpiresAt: 1, status: 1 });

export const CheckInReservation =
  mongoose.models.CheckInReservation ||
  mongoose.model<ICheckInReservation>(
    "CheckInReservation",
    CheckInReservationSchema
  );
