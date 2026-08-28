export type PuzzleRushMode = "3m" | "5m" | "survival";

export const PUZZLE_RUSH_MODES: PuzzleRushMode[] = ["3m", "5m", "survival"];

export interface PuzzleRushDifficultyBand {
  minRating: number;
  points: number;
}

export interface PuzzleRushSpeedBand {
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

export const sanitizeSpeedBands = (
  raw: unknown
): PuzzleRushSpeedBand[] => {
  const fallback = PUZZLE_RUSH_CONFIG_DEFAULTS.scoring.speedBands;
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const bands: PuzzleRushSpeedBand[] = [];
  for (const item of raw) {
    const obj = (item ?? {}) as Record<string, unknown>;
    if (!isFiniteNumber(obj.multiplier)) continue;
    const maxSec = obj.maxSec === null || obj.maxSec === undefined
      ? null
      : isFiniteNumber(obj.maxSec) ? obj.maxSec : null;
    bands.push({ maxSec, multiplier: Math.max(0, obj.multiplier) });
  }
  return bands.length > 0 ? bands : fallback;
};

export const sanitizeStreakBands = (
  raw: unknown
): PuzzleRushStreakBand[] => {
  const fallback = PUZZLE_RUSH_CONFIG_DEFAULTS.scoring.streakBands;
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const bands: PuzzleRushStreakBand[] = [];
  for (const item of raw) {
    const obj = (item ?? {}) as Record<string, unknown>;
    if (!isFiniteNumber(obj.minStreak) || !isFiniteNumber(obj.multiplier)) continue;
    bands.push({ minStreak: Math.max(0, obj.minStreak), multiplier: Math.max(0, obj.multiplier) });
  }
  return bands.length > 0 ? bands : fallback;
};
