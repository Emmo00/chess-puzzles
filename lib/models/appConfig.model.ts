import * as mongoose from "mongoose";

export type AppConfigKey = "scoring" | "access";

export interface AppConfig {
  key: AppConfigKey;
  value: Record<string, unknown>;
}

const appConfigSchema = new mongoose.Schema(
  {
    key: { type: String, enum: ["scoring", "access"], required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

const appConfigModel =
  mongoose.models?.AppConfig ||
  mongoose.model<AppConfig & mongoose.Document>("AppConfig", appConfigSchema);

export default appConfigModel;
