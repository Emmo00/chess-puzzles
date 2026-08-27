import * as mongoose from "mongoose";

export interface Nonce {
  nonce: string;
  walletAddress: string;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
}

const nonceSchema = new mongoose.Schema({
  nonce: { type: String, required: true, unique: true, index: true },
  walletAddress: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  used: { type: Boolean, default: false },
});

const nonceModel =
  mongoose.models?.Nonce ||
  mongoose.model<Nonce & mongoose.Document>("Nonce", nonceSchema);

export default nonceModel;
