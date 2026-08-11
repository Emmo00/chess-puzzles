import * as mongoose from "mongoose";

export interface IssuedPuzzleDoc {
  sessionId: string;
  userWalletAddress: string;
  puzzleId: string;
  playerMoves: number;
  rating: number;
  used: boolean;
  playedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IssuedPuzzleRow extends Omit<IssuedPuzzleDoc, "createdAt" | "updatedAt"> {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const IssuedPuzzleSchema = new mongoose.Schema<IssuedPuzzleDoc & mongoose.Document>(
  {
    sessionId: { type: String, required: true, index: true },
    userWalletAddress: { type: String, required: true, index: true },
    puzzleId: { type: String, required: true },
    playerMoves: { type: Number, required: true },
    rating: { type: Number, required: true },
    used: { type: Boolean, default: false },
    playedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

IssuedPuzzleSchema.index({ sessionId: 1, puzzleId: 1 }, { unique: true });

const issuedPuzzleModel =
  mongoose.models?.IssuedPuzzle ||
  mongoose.model<IssuedPuzzleDoc & mongoose.Document>(
    "IssuedPuzzle",
    IssuedPuzzleSchema
  );

export default issuedPuzzleModel;
