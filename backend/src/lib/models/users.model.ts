import * as mongoose from "mongoose";
import { WalletUser, UserStats, UserSettings } from "../types";

const userSchema = new mongoose.Schema({
  walletAddress: { type: String, lowercase: true, unique: true, sparse: true },
  username: { type: String },
  displayName: { type: String, required: true },
  pfpUrl: { type: String },
  totalPoints: { type: Number, default: 0 },
  puzzlesSolved: { type: Number, default: 0 },
  lastLogin: { type: Date, default: Date.now },
  currentStreak: { type: Number, default: 1 },
  longestStreak: { type: Number, default: 1 },
  totalPuzzlesSolved: { type: Number, default: 0 },
  lastPuzzleDate: { type: String, default: null },
  hintBalance: { type: Number, default: 0 },
  streakFreezes: { type: Number, default: 0 },
  streakFreezeUsedDays: { type: [Number], default: [] },
  streakEvent: {
    eventType: { type: String, enum: ["freeze_used", "streak_lost"], default: null },
    day: { type: Number, default: null },
    notified: { type: Boolean, default: false },
  },
  effectiveRating: { type: Number, default: 1000 },
  // Puzzle Rush leaderboard fields (separate from the standard season leaderboard)
  puzzleRushBestScore: { type: Number, default: 0 },
  puzzleRushBestAt: { type: Date },
  puzzleRushLastRank: { type: Number, default: null },
  // User settings
  settings: {
    ratingRange: {
      min: { type: Number, default: 800 },
      max: { type: Number, default: 2000 },
    },
    disabledThemes: { type: [String], default: [] },
  },
});

const userModel =
  mongoose.models?.User || mongoose.model<WalletUser & UserStats & { settings: UserSettings } & mongoose.Document>("User", userSchema);

export default userModel;
