export interface AccessConfig {
  dailyFreePuzzles: number;
  unlockAmountUsd: string;
  unlockDurationHours: number;
  defaultHints: number;
  defaultStreakFreezes: number;
}

export const ACCESS_CONFIG_DEFAULTS: AccessConfig = {
  dailyFreePuzzles: 3,
  unlockAmountUsd: "0.01",
  unlockDurationHours: 24,
  defaultHints: 5,
  defaultStreakFreezes: 1,
};

let cachedAccessConfig: AccessConfig | null = null;

async function loadAppConfigModel() {
  const mod = await import("../models/appConfig.model");
  return mod.default;
}

export async function getAccessConfig(): Promise<AccessConfig> {
  if (cachedAccessConfig) return cachedAccessConfig;
  try {
    const appConfigModel = await loadAppConfigModel();
    const dbConnect = (await import("../db")).default;
    await dbConnect();
    const doc = await appConfigModel.findOne({ key: "access" }).lean();
    if (doc?.value && typeof doc.value === "object") {
      const v = doc.value as Record<string, unknown>;
      const merged: AccessConfig = {
        dailyFreePuzzles:
          typeof v.dailyFreePuzzles === "number" ? v.dailyFreePuzzles : ACCESS_CONFIG_DEFAULTS.dailyFreePuzzles,
        unlockAmountUsd:
          typeof v.unlockAmountUsd === "string" ? v.unlockAmountUsd : ACCESS_CONFIG_DEFAULTS.unlockAmountUsd,
        unlockDurationHours:
          typeof v.unlockDurationHours === "number" ? v.unlockDurationHours : ACCESS_CONFIG_DEFAULTS.unlockDurationHours,
        defaultHints:
          typeof v.defaultHints === "number" ? v.defaultHints : ACCESS_CONFIG_DEFAULTS.defaultHints,
        defaultStreakFreezes:
          typeof v.defaultStreakFreezes === "number" ? v.defaultStreakFreezes : ACCESS_CONFIG_DEFAULTS.defaultStreakFreezes,
      };
      cachedAccessConfig = merged;
      return merged;
    }
  } catch {
    // fall through to defaults
  }
  return ACCESS_CONFIG_DEFAULTS;
}

export async function saveAccessConfig(config: AccessConfig): Promise<AccessConfig> {
  const appConfigModel = await loadAppConfigModel();
  const dbConnect = (await import("../db")).default;
  await dbConnect();
  const merged: AccessConfig = {
    dailyFreePuzzles:
      typeof config.dailyFreePuzzles === "number"
        ? config.dailyFreePuzzles
        : ACCESS_CONFIG_DEFAULTS.dailyFreePuzzles,
    unlockAmountUsd:
      typeof config.unlockAmountUsd === "string"
        ? config.unlockAmountUsd
        : ACCESS_CONFIG_DEFAULTS.unlockAmountUsd,
    unlockDurationHours:
      typeof config.unlockDurationHours === "number"
        ? config.unlockDurationHours
        : ACCESS_CONFIG_DEFAULTS.unlockDurationHours,
    defaultHints:
      typeof config.defaultHints === "number"
        ? config.defaultHints
        : ACCESS_CONFIG_DEFAULTS.defaultHints,
    defaultStreakFreezes:
      typeof config.defaultStreakFreezes === "number"
        ? config.defaultStreakFreezes
        : ACCESS_CONFIG_DEFAULTS.defaultStreakFreezes,
  };
  await appConfigModel.updateOne(
    { key: "access" },
    { $set: { value: merged as Record<string, unknown> } },
    { upsert: true }
  );
  cachedAccessConfig = merged;
  return merged;
}

export function clearAccessConfigCache(): void {
  cachedAccessConfig = null;
}
