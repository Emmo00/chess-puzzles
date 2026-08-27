import {
  type PuzzleRushConfig,
  PUZZLE_RUSH_CONFIG_DEFAULTS,
} from "../config/puzzleRush";

export interface PuzzleRushPuzzleScoreInput {
  rating: number;
  // solve time in seconds
  solveTimeSec: number;
  // consecutive correct solves including this one (>= 1)
  streakCount: number;
  config?: PuzzleRushConfig;
}

export function basePointsForRating(
  rating: number,
  config: PuzzleRushConfig = PUZZLE_RUSH_CONFIG_DEFAULTS
): number {
  const r = Math.max(0, Math.floor(rating));
  const bands = config.scoring.difficultyBands;
  let points = bands.length > 0 ? bands[bands.length - 1].points : 0;
  for (const band of bands) {
    if (r >= band.minRating) {
      points = band.points;
    } else {
      break;
    }
  }
  return points;
}

export function speedMultiplier(
  solveTimeSec: number,
  config: PuzzleRushConfig = PUZZLE_RUSH_CONFIG_DEFAULTS
): number {
  const t = Math.floor(solveTimeSec);
  const bands = config.scoring.speedBands;
  const fallback = bands.length > 0 ? bands[bands.length - 1].multiplier : 1;
  for (const band of bands) {
    if (band.maxSec === null) {
      return band.multiplier; // unbounded final tier
    }
    if (t <= band.maxSec) {
      return band.multiplier;
    }
  }
  return fallback;
}

export function streakMultiplier(
  streakCount: number,
  config: PuzzleRushConfig = PUZZLE_RUSH_CONFIG_DEFAULTS
): number {
  const s = Math.max(1, Math.floor(streakCount));
  const bands = config.scoring.streakBands;
  let multiplier = bands.length > 0 ? bands[bands.length - 1].multiplier : 1;
  for (const band of bands) {
    if (s >= band.minStreak) {
      multiplier = band.multiplier;
    } else {
      break;
    }
  }
  return multiplier;
}

export function calculatePuzzleRushPuzzleScore(
  input: PuzzleRushPuzzleScoreInput
): number {
  const config = input.config ?? PUZZLE_RUSH_CONFIG_DEFAULTS;
  const base = basePointsForRating(input.rating, config);
  const speed = speedMultiplier(input.solveTimeSec, config);
  const streak = streakMultiplier(input.streakCount, config);
  return Math.max(0, Math.round(base * speed * streak));
}