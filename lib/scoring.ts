import { SCORING_CONFIG_DEFAULTS, type ScoringConfig } from "./config/scoring";

export type { ScoringConfig } from "./config/scoring";
export { useNewScoring } from "./config/scoring";

export type PuzzleKind = "standard" | "daily";

export interface ScoringInput {
  kind: PuzzleKind;
  hintCount: number;
  streak: number;
  solveTimeSec: number;
  config?: ScoringConfig;
}

export interface ScoringBreakdown {
  base: number;
  hintPenalty: number;
  streakMultiplier: number;
  speedBonus: number;
  points: number;
  failed: boolean;
}

export function getBasePoints(
  kind: PuzzleKind,
  config: ScoringConfig = SCORING_CONFIG_DEFAULTS
): number {
  return kind === "daily" ? config.basePointsDaily : config.basePointsStandard;
}

export function isFailed(
  hintCount: number,
  config: ScoringConfig = SCORING_CONFIG_DEFAULTS
): boolean {
  return hintCount >= config.hintFailThreshold;
}

export function getHintPenalty(
  hintCount: number,
  config: ScoringConfig = SCORING_CONFIG_DEFAULTS
): number {
  if (isFailed(hintCount, config)) return 0;
  if (hintCount === 1) return config.hintPenalty1;
  if (hintCount === 2) return config.hintPenalty2;
  return 0;
}

export function streakMultiplier(
  streak: number,
  config: ScoringConfig = SCORING_CONFIG_DEFAULTS
): number {
  const s = Math.max(0, Math.floor(streak));
  if (s >= config.streakCapAt) return config.streakCap;
  const value = 1 + (s - 1) * config.streakStep;
  return Math.min(Math.max(1, value), config.streakCap);
}

export function speedBonus(
  hintCount: number,
  solveTimeSec: number,
  config: ScoringConfig = SCORING_CONFIG_DEFAULTS
): number {
  if (hintCount !== 0) return 0;
  if (!Number.isFinite(solveTimeSec) || solveTimeSec <= 0) return 0;
  if (solveTimeSec <= config.speedBonusThresholdSec) return config.speedBonus;
  return 0;
}

export function calculateEarnedPoints(input: ScoringInput): ScoringBreakdown {
  const config = input.config ?? SCORING_CONFIG_DEFAULTS;
  const base = getBasePoints(input.kind, config);

  if (isFailed(input.hintCount, config)) {
    return {
      base,
      hintPenalty: 0,
      streakMultiplier: 0,
      speedBonus: 0,
      points: 0,
      failed: true,
    };
  }

  const hintPenalty = getHintPenalty(input.hintCount, config);
  const mStreak = streakMultiplier(input.streak, config);
  const bSpeed = speedBonus(input.hintCount, input.solveTimeSec, config);
  const scaled = (base - hintPenalty) * mStreak;
  const points = Math.max(0, Math.floor(scaled) + bSpeed);

  return {
    base,
    hintPenalty,
    streakMultiplier: mStreak,
    speedBonus: bSpeed,
    points,
    failed: false,
  };
}

export function calculatePointsLegacy(input: {
  rating: number;
  mistakes: number;
  hintCount: number;
}): number {
  const { rating, mistakes, hintCount } = input;
  let basePoints: number;
  if (rating < 1000) basePoints = 10;
  else if (rating < 1400) basePoints = 25;
  else if (rating < 1800) basePoints = 50;
  else basePoints = 100;

  let hintMultiplier: number;
  if (hintCount === 0) hintMultiplier = 1.0;
  else if (hintCount === 1) hintMultiplier = 0.5;
  else if (hintCount === 2) hintMultiplier = 0.25;
  else hintMultiplier = 0.0;

  let mistakeMultiplier: number;
  if (mistakes === 0) mistakeMultiplier = 1.0;
  else if (mistakes === 1) mistakeMultiplier = 0.8;
  else mistakeMultiplier = 0.6;

  return Math.round(basePoints * hintMultiplier * mistakeMultiplier);
}
