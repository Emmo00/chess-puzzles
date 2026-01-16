export interface PointsCalculationParams {
  rating: number;
  mistakes: number;
  hintCount: number;
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
 * Get hint multiplier based on number of hints used
 * 0 hints: 1.0 (full points)
 * 1 hint: 0.5 (half points)
 * 2 hints: 0.25 (quarter points)
 * 3+ hints: 0.0 (no points)
 */
export function getHintMultiplier(hintCount: number): number {
  if (hintCount === 0) return 1.0;
  if (hintCount === 1) return 0.5;
  if (hintCount === 2) return 0.25;
  return 0.0;
}

/**
 * Get mistake multiplier based on number of mistakes
 * 0 mistakes: 1.0 (full points)
 * 1 mistake: 0.8 (80% points)
 * 2+ mistakes: 0.6 (60% points)
 */
export function getMistakeMultiplier(mistakes: number): number {
  if (mistakes === 0) return 1.0;
  if (mistakes === 1) return 0.8;
  return 0.6;
}

/**
 * Calculate points awarded for solving a puzzle
 * PointsAwarded = BasePoints × HintMultiplier × MistakeMultiplier
 */
export function calculatePoints({ rating, mistakes, hintCount }: PointsCalculationParams): number {
  const basePoints = getBasePoints(rating);
  const hintMultiplier = getHintMultiplier(hintCount);
  const mistakeMultiplier = getMistakeMultiplier(mistakes);
  return Math.round(basePoints * hintMultiplier * mistakeMultiplier);
}