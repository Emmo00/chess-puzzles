import * as mongoose from "mongoose";

export type PuzzleRushSessionStatus = "active" | "completed";

export interface PuzzleRushPuzzleResult {
  stepIndex: number;
  puzzleId: string;
  rating: number;
  solved: boolean;
  solveTimeSec: number;
}

export interface PuzzleRushSessionDoc {
  userWalletAddress: string;
  mode: string;
  startTime: Date;
  endTime?: Date;
  durationSec?: number;
  status: PuzzleRushSessionStatus;
  stepIndex: number;
  pendingPuzzleId: string | null;
  pendingRating: number | null;
  puzzlesAttempted: number;
  puzzlesSolved: number;
  strikes: number;
  score: number;
  currentStreak: number;
  longestStreak: number;
  totalSolveTimeSec: number;
  highestDifficultySolved: number;
  finalRank: number | null;
  rankDelta: number | null;
  results: PuzzleRushPuzzleResult[];
  createdAt: Date;
  updatedAt: Date;
}

const PuzzleRushPuzzleResultSchema = new mongoose.Schema(
  {
    stepIndex: { type: Number, required: true },
    puzzleId: { type: String, required: true },
    rating: { type: Number, required: true },
    solved: { type: Boolean, required: true },
    solveTimeSec: { type: Number, required: true },
  },
  { _id: false }
);

const PuzzleRushSessionSchema = new mongoose.Schema(
  {
    userWalletAddress: { type: String, required: true, index: true },
    mode: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    durationSec: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "completed"], default: "active" },
    stepIndex: { type: Number, default: 0 },
    pendingPuzzleId: { type: String, default: null },
    pendingRating: { type: Number, default: null },
    puzzlesAttempted: { type: Number, default: 0 },
    puzzlesSolved: { type: Number, default: 0 },
    strikes: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalSolveTimeSec: { type: Number, default: 0 },
    highestDifficultySolved: { type: Number, default: 0 },
    finalRank: { type: Number, default: null },
    rankDelta: { type: Number, default: null },
    results: { type: [PuzzleRushPuzzleResultSchema], default: [] },
  },
  { timestamps: true }
);

PuzzleRushSessionSchema.index({ userWalletAddress: 1, status: 1 });

const puzzleRushSessionModel =
  mongoose.models?.PuzzleRushSession ||
  mongoose.model<PuzzleRushSessionDoc & mongoose.Document>("PuzzleRushSession", PuzzleRushSessionSchema);

export default puzzleRushSessionModel;
