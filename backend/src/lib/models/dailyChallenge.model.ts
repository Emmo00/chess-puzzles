import mongoose, { Document, Schema } from "mongoose";

interface IDailyChallengePuzzle {
  puzzleId: string;
  fen: string;
  rating: number;
  ratingDeviation: number;
  moves: string[];
  themes: string[];
}

export interface IDailyChallenge extends Document {
  utcDay: number;
  puzzle: IDailyChallengePuzzle;
  activeReservationCount: number;
  maxDailyCheckInsSnapshot: number;
  checkInAmountWeiSnapshot: string;
  createdByWallet: string;
  createdAt: Date;
  updatedAt: Date;
}

const DailyChallengeSchema = new Schema<IDailyChallenge>(
  {
    utcDay: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    puzzle: {
      puzzleId: { type: String, required: true },
      fen: { type: String, required: true },
      rating: { type: Number, required: true },
      ratingDeviation: { type: Number, required: true },
      moves: { type: [String], required: true },
      themes: { type: [String], default: [] },
    },
    activeReservationCount: {
      type: Number,
      default: 0,
    },
    maxDailyCheckInsSnapshot: {
      type: Number,
      required: true,
    },
    checkInAmountWeiSnapshot: {
      type: String,
      required: true,
    },
    createdByWallet: {
      type: String,
      required: true,
      lowercase: true,
      match: /^0x[a-fA-F0-9]{40}$/,
    },
  },
  {
    timestamps: true,
  }
);

export const DailyChallenge =
  mongoose.models.DailyChallenge ||
  mongoose.model<IDailyChallenge>("DailyChallenge", DailyChallengeSchema);
