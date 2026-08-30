export type PuzzleRushMode = "3m" | "5m" | "survival";

export const PUZZLE_RUSH_MODES: PuzzleRushMode[] = ["3m", "5m", "survival"];

export interface PuzzleRushDifficultyBand {
  minRating: number;
  points: number;
}

export interface PuzzleRushSpeedBand {
  // Inclusive upper bound in seconds. `null` means unbounded (last tier).
  maxSec: number | null;
  multiplier: number;
}

export interface PuzzleRushStreakBand {
  minStreak: number;
  multiplier: number;
}

export interface PuzzleRushScoringConfig {
  difficultyBands: PuzzleRushDifficultyBand[];
  speedBands: PuzzleRushSpeedBand[];
  streakBands: PuzzleRushStreakBand[];
}

export interface PuzzleRushAccessConfig {
  freeSessionsPerDay: number;
  strikesToEnd: number;
  survivalCapSec: number;
  minSolveTimeSec: number;
  maxSolveTimeSec: number;
  modeDurationsSec: Record<PuzzleRushMode, number>;
}

export interface PuzzleRushConfig {
  scoring: PuzzleRushScoringConfig;
  access: PuzzleRushAccessConfig;
}

export const PUZZLE_RUSH_CONFIG_DEFAULTS: PuzzleRushConfig = {
  scoring: {
    difficultyBands: [
      { minRating: 0, points: 50 },
      { minRating: 1000, points: 75 },
      { minRating: 1200, points: 100 },
      { minRating: 1400, points: 125 },
      { minRating: 1600, points: 150 },
      { minRating: 1800, points: 175 },
      { minRating: 2000, points: 200 },
      { minRating: 2200, points: 250 },
    ],
    speedBands: [
      { maxSec: 5, multiplier: 1.5 },
      { maxSec: 10, multiplier: 1.25 },
      { maxSec: 20, multiplier: 1.1 },
      { maxSec: 30, multiplier: 1.0 },
      { maxSec: null, multiplier: 0.9 },
    ],
    streakBands: [
      { minStreak: 1, multiplier: 1.0 },
      { minStreak: 3, multiplier: 1.1 },
      { minStreak: 5, multiplier: 1.2 },
      { minStreak: 7, multiplier: 1.3 },
      { minStreak: 10, multiplier: 1.5 },
    ],
  },
  access: {
    freeSessionsPerDay: 1,
    strikesToEnd: 3,
    survivalCapSec: 3600,
    minSolveTimeSec: 1,
    maxSolveTimeSec: 300,
    modeDurationsSec: { "3m": 180, "5m": 300, survival: 0 },
  },
};

let cachedPuzzleRushConfig: PuzzleRushConfig | null = null;

async function loadAppConfigModel() {
  const mod = await import("@workspace/db");
  return mod.AppConfig;
}

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

export const sanitizeDifficultyBands = (
  raw: unknown
): PuzzleRushDifficultyBand[] => {
  const fallback = PUZZLE_RUSH_CONFIG_DEFAULTS.scoring.difficultyBands;
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const bands: PuzzleRushDifficultyBand[] = [];
  for (const item of raw) {
    const obj = (item ?? {}) as Record<string, unknown>;
    if (!isFiniteNumber(obj.minRating) || !isFiniteNumber(obj.points)) continue;
    bands.push({ minRating: Math.max(0, obj.minRating), points: Math.max(0, obj.points) });
  }
  return bands.length > 0 ? bands : fallback;
};

export const sanitizeSpeedBands = (raw: unknown): PuzzleRushSpeedBand[] => {
  const fallback = PUZZLE_RUSH_CONFIG_DEFAULTS.scoring.speedBands;
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const bands: PuzzleRushSpeedBand[] = [];
  for (const item of raw) {
    const obj = (item ?? {}) as Record<string, unknown>;
    if (!isFiniteNumber(obj.multiplier)) continue;
    const maxSec = obj.maxSec === null ? null : obj.maxSec;
    if (maxSec !== null && !isFiniteNumber(maxSec)) continue;
    bands.push({
      maxSec: maxSec as number | null,
      multiplier: Math.max(0, obj.multiplier),
    });
  }
  return bands.length > 0 ? bands : fallback;
};

export const sanitizeStreakBands = (raw: unknown): PuzzleRushStreakBand[] => {
  const fallback = PUZZLE_RUSH_CONFIG_DEFAULTS.scoring.streakBands;
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const bands: PuzzleRushStreakBand[] = [];
  for (const item of raw) {
    const obj = (item ?? {}) as Record<string, unknown>;
    if (!isFiniteNumber(obj.minStreak) || !isFiniteNumber(obj.multiplier)) continue;
    bands.push({
      minStreak: Math.max(0, obj.minStreak),
      multiplier: Math.max(0, obj.multiplier),
    });
  }
  return bands.length > 0 ? bands : fallback;
};

const sanitizeAccess = (raw: unknown): PuzzleRushAccessConfig => {
  const d = PUZZLE_RUSH_CONFIG_DEFAULTS.access;
  const obj = (raw ?? {}) as Record<string, unknown>;
  const modeDurations =
    (obj.modeDurationsSec as Record<string, unknown> | undefined) ?? {};
  return {
    freeSessionsPerDay: isFiniteNumber(obj.freeSessionsPerDay)
      ? Math.max(0, Math.floor(obj.freeSessionsPerDay))
      : d.freeSessionsPerDay,
    strikesToEnd: isFiniteNumber(obj.strikesToEnd)
      ? Math.max(1, Math.floor(obj.strikesToEnd))
      : d.strikesToEnd,
    survivalCapSec: isFiniteNumber(obj.survivalCapSec)
      ? Math.max(60, Math.floor(obj.survivalCapSec))
      : d.survivalCapSec,
    minSolveTimeSec: isFiniteNumber(obj.minSolveTimeSec)
      ? Math.max(0, Math.floor(obj.minSolveTimeSec))
      : d.minSolveTimeSec,
    maxSolveTimeSec: isFiniteNumber(obj.maxSolveTimeSec)
      ? Math.max(1, Math.floor(obj.maxSolveTimeSec))
      : d.maxSolveTimeSec,
    modeDurationsSec: {
      "3m": isFiniteNumber(modeDurations["3m"])
        ? Math.max(1, Math.floor(modeDurations["3m"]))
        : d.modeDurationsSec["3m"],
      "5m": isFiniteNumber(modeDurations["5m"])
        ? Math.max(1, Math.floor(modeDurations["5m"]))
        : d.modeDurationsSec["5m"],
      survival: 0,
    },
  };
};

export function sanitizePuzzleRushConfig(raw: unknown): PuzzleRushConfig {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const scoring = (obj.scoring ?? {}) as Record<string, unknown>;
  return {
    scoring: {
      difficultyBands: sanitizeDifficultyBands(scoring.difficultyBands),
      speedBands: sanitizeSpeedBands(scoring.speedBands),
      streakBands: sanitizeStreakBands(scoring.streakBands),
    },
    access: sanitizeAccess(obj.access),
  };
}

// Partial merge used by the admin panel: fields present in `patch` override the
// current config; everything else is kept.
export function mergePuzzleRushConfig(
  current: PuzzleRushConfig,
  patch: unknown
): PuzzleRushConfig {
  const obj = (patch ?? {}) as Record<string, unknown>;
  const scoring = (obj.scoring ?? {}) as Record<string, unknown>;
  const access = (obj.access ?? {}) as Record<string, unknown>;

  const next: PuzzleRushConfig = {
    scoring: {
      difficultyBands: current.scoring.difficultyBands,
      speedBands: current.scoring.speedBands,
      streakBands: current.scoring.streakBands,
    },
    access: { ...current.access, modeDurationsSec: { ...current.access.modeDurationsSec } },
  };

  if (Array.isArray(scoring.difficultyBands)) {
    next.scoring.difficultyBands = sanitizeDifficultyBands(scoring.difficultyBands);
  }
  if (Array.isArray(scoring.speedBands)) {
    next.scoring.speedBands = sanitizeSpeedBands(scoring.speedBands);
  }
  if (Array.isArray(scoring.streakBands)) {
    next.scoring.streakBands = sanitizeStreakBands(scoring.streakBands);
  }

  const numOrDefault = (
    value: unknown,
    fallback: number,
    min: number
  ): number => (isFiniteNumber(value) ? Math.max(min, value) : fallback);

  if (typeof access === "object") {
    next.access.freeSessionsPerDay = numOrDefault(
      access.freeSessionsPerDay,
      current.access.freeSessionsPerDay,
      0
    );
    next.access.strikesToEnd = numOrDefault(
      access.strikesToEnd,
      current.access.strikesToEnd,
      1
    );
    next.access.survivalCapSec = numOrDefault(
      access.survivalCapSec,
      current.access.survivalCapSec,
      60
    );
    next.access.minSolveTimeSec = numOrDefault(
      access.minSolveTimeSec,
      current.access.minSolveTimeSec,
      0
    );
    next.access.maxSolveTimeSec = numOrDefault(
      access.maxSolveTimeSec,
      current.access.maxSolveTimeSec,
      1
    );
    const durations = (access.modeDurationsSec ?? {}) as Record<string, unknown>;
    if (isFiniteNumber(durations["3m"])) {
      next.access.modeDurationsSec["3m"] = Math.max(1, durations["3m"]);
    }
    if (isFiniteNumber(durations["5m"])) {
      next.access.modeDurationsSec["5m"] = Math.max(1, durations["5m"]);
    }
  }

  return next;
}

export async function getPuzzleRushConfig(): Promise<PuzzleRushConfig> {
  if (cachedPuzzleRushConfig) return cachedPuzzleRushConfig;
  try {
    const appConfigModel = await loadAppConfigModel();
    const { dbConnect } = await import("@workspace/db");
    await dbConnect();
    const doc = await appConfigModel.findOne({ key: "puzzleRush" }).lean();
    if (doc?.value && typeof doc.value === "object") {
      cachedPuzzleRushConfig = sanitizePuzzleRushConfig(doc.value);
      return cachedPuzzleRushConfig;
    }
  } catch {
    // fall through to defaults
  }
  return PUZZLE_RUSH_CONFIG_DEFAULTS;
}

export async function savePuzzleRushConfig(
  config: PuzzleRushConfig
): Promise<PuzzleRushConfig> {
  const appConfigModel = await loadAppConfigModel();
  const { dbConnect } = await import("@workspace/db");
  await dbConnect();
  const merged: PuzzleRushConfig = sanitizePuzzleRushConfig(config);
  await appConfigModel.updateOne(
    { key: "puzzleRush" },
    { $set: { value: merged as unknown as Record<string, unknown> } },
    { upsert: true }
  );
  cachedPuzzleRushConfig = merged;
  return merged;
}

export function clearPuzzleRushConfigCache(): void {
  cachedPuzzleRushConfig = null;
}