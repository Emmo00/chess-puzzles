export interface PointsCalculationParams {
  rating: number;
  mistakes: number;
  usedHint: boolean;
  usedSolution: boolean;
}

/**
 * Get base points based on puzzle rating
 * Easy (800–1000): 10 pts
 * Medium (1000–1400): 25 pts
 * Hard (1400–1800): 50 pts
 * Expert (1800+): 100 pts
 */
export function getBasePoints(rating: number): number {
  if (rating < 1000) return 10;
  if (rating < 1400) return 25;
  if (rating < 1800) return 50;
  return 100;
}

/**
 * Get accuracy multiplier based on mistakes, hint usage, and solution usage
 * 0.0 (used solution - no points)
 * 0.5 (used hint)
 * 1.0 (first attempt, no hints)
 * 0.8 (one mistake)
 * 0.6 (multiple mistakes)
 */
export function getAccuracyMultiplier(mistakes: number, usedHint: boolean, usedSolution: boolean): number {
  if (usedSolution) return 0.0;
  if (usedHint) return 0.5;
  if (mistakes === 0) return 1.0;
  if (mistakes === 1) return 0.8;
  return 0.6;
}

/**
 * Calculate points awarded for solving a puzzle
 * PointsAwarded = BasePoints × AccuracyMultiplier
 */
export function calculatePoints({ rating, mistakes, usedHint, usedSolution }: PointsCalculationParams): number {
  const basePoints = getBasePoints(rating);
  const multiplier = getAccuracyMultiplier(mistakes, usedHint, usedSolution);
  return Math.round(basePoints * multiplier);
}