import * as mongoose from "mongoose";
import { QuickAuthUser, WalletUser, UserStats } from "../types";
import { unique } from "next/dist/build/utils";

const userSchema = new mongoose.Schema({
  // Support both legacy FID and new wallet address
  fid: { type: Number, sparse: true , unique: true},
  walletAddress: { type: String, lowercase: true, unique: true, sparse: true },
  username: { type: String },
  displayName: { type: String, required: true },
  pfpUrl: { type: String },
  total_points: { type: Number, default: 0 },
  puzzles_solved: { type: Number, default: 0 },
  current_streak: { type: Number, default: 0 },
  longest_streak: { type: Number, default: 0 },
  last_login: { type: Date, default: Date.now },
  // Legacy fields for backward compatibility
  points: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 1 },
  lastLoggedIn: { type: Date, default: Date.now },
  longestStreak: { type: Number, default: 1 },
  totalPuzzlesSolved: { type: Number, default: 0 },
  // Premium and streak monetization fields
  lastPuzzleDate: { type: String, default: null },
  paidPremiumExpiry: { type: String, default: null },
});

// Create compound unique index to ensure either fid OR walletAddress is unique
userSchema.index({ fid: 1 , walletAddress: 1});

const userModel = mongoose.models?.User || mongoose.model<(QuickAuthUser | WalletUser) & UserStats & mongoose.Document>("User", userSchema);

export default userModel;