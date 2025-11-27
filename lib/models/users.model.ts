import * as mongoose from "mongoose";
import { QuickAuthUser, UserStats } from "../types";

const userSchema = new mongoose.Schema({
  fid: { type: Number, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  pfpUrl: { type: String, required: true },
  points: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 1 },
  lastLoggedIn: { type: Date, default: Date.now },
  longestStreak: { type: Number, default: 1 },
  totalPuzzlesSolved: { type: Number, default: 0 },
});

const userModel = mongoose.models?.User || mongoose.model<QuickAuthUser & UserStats & mongoose.Document>("User", userSchema);

export default userModel;