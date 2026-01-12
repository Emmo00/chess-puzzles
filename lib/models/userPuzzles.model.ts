import * as mongoose from "mongoose";
import { UserPuzzle } from "../types";

const UserPuzzleSchema = new mongoose.Schema({
  userfid: { type: String, required: true },
  puzzleId: { type: String, required: true },
  completed: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
  type: { type: String, enum: ["solve", "daily"], required: true },
  points: { type: Number, default: 0 },
  solvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

const userPuzzleModel = mongoose.models?.UserPuzzle || mongoose.model<UserPuzzle & mongoose.Document>("UserPuzzle", UserPuzzleSchema);

export default userPuzzleModel;