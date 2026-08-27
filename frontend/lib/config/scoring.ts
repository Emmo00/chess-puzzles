export interface ScoringConfig {
  basePointsStandard: number;
  basePointsDaily: number;
  hintPenalty1: number;
  hintPenalty2: number;
  hintFailThreshold: number;
  streakCap: number;
  streakStep: number;
  streakCapAt: number;
  speedBonus: number;
  speedBonusThresholdSec: number;
}

export const SCORING_CONFIG_DEFAULTS: ScoringConfig = {
  basePointsStandard: 100,
  basePointsDaily: 200,
  hintPenalty1: 30,
  hintPenalty2: 60,
  hintFailThreshold: 3,
  streakCap: 1.5,
  streakStep: 0.1,
  streakCapAt: 5,
  speedBonus: 25,
  speedBonusThresholdSec: 15,
};

let cachedScoringConfig: ScoringConfig | null = null;

async function loadAppConfigModel() {
  const mod = await import("../models/appConfig.model");
  return mod.default;
}

export async function getScoringConfig(): Promise<ScoringConfig> {
  if (cachedScoringConfig) return cachedScoringConfig;
  try {
    const appConfigModel = await loadAppConfigModel();
    const dbConnect = (await import("../db")).default;
    await dbConnect();
    const doc = await appConfigModel.findOne({ key: "scoring" }).lean();
    if (doc?.value && typeof doc.value === "object") {
      const merged: ScoringConfig = { ...SCORING_CONFIG_DEFAULTS };
      for (const key of Object.keys(SCORING_CONFIG_DEFAULTS)) {
        const v = (doc.value as unknown as Record<string, unknown>)[key];
        if (typeof v === "number") (merged as unknown as Record<string, unknown>)[key] = v;
      }
      cachedScoringConfig = merged;
      return merged;
    }
  } catch {
    // fall through to defaults
  }
  return SCORING_CONFIG_DEFAULTS;
}

export async function saveScoringConfig(config: ScoringConfig): Promise<ScoringConfig> {
  const appConfigModel = await loadAppConfigModel();
  const dbConnect = (await import("../db")).default;
  await dbConnect();
  const merged: ScoringConfig = { ...SCORING_CONFIG_DEFAULTS };
  for (const key of Object.keys(SCORING_CONFIG_DEFAULTS)) {
    const v = (config as unknown as Record<string, unknown>)[key];
    if (typeof v === "number") (merged as unknown as Record<string, unknown>)[key] = v;
  }
  await appConfigModel.updateOne(
    { key: "scoring" },
    { $set: { value: merged as unknown as Record<string, unknown> } },
    { upsert: true }
  );
  cachedScoringConfig = merged;
  return merged;
}

export function clearScoringConfigCache(): void {
  cachedScoringConfig = null;
}
