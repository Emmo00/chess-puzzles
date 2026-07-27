import * as mongoose from "mongoose";

export type StoreItemType = "hints" | "streak_freeze" | "mystery_box" | "cosmetic";
export type StoreItemSubtype = "board_theme" | "avatar_skin";

export interface StoreItem {
  name: string;
  description: string;
  category: StoreItemType;
  subtype?: StoreItemSubtype;
  priceUsd: string;
  quantity: number;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const storeItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    category: {
      type: String,
      enum: ["hints", "streak_freeze", "mystery_box", "cosmetic"],
      required: true,
    },
    subtype: {
      type: String,
      enum: ["board_theme", "avatar_skin"],
    },
    priceUsd: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 1 },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const storeItemModel =
  mongoose.models?.StoreItem ||
  mongoose.model<StoreItem & mongoose.Document>("StoreItem", storeItemSchema);

export default storeItemModel;
