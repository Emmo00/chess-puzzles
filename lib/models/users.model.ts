import * as mongoose from "mongoose";
import { WalletUser, UserStats } from "../types";
import { unique } from "next/dist/build/utils";

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
});

userSchema.index({ walletAddress: 1 });

const userModel =
  mongoose.models?.User || mongoose.model<WalletUser & UserStats & mongoose.Document>("User", userSchema);

export default userModel;
