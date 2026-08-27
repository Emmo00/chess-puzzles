export const LEVEL_POINTS_PER_SQRT_UNIT = 100;
export const COMPLETED_LEVEL_WINDOW = 20;
export const UPCOMING_LEVEL_WINDOW = 20;
export const CHEST_INTERVAL = 5;

export function levelForPoints(points: number): number {
  const p = Math.max(0, points);
  return Math.floor(Math.sqrt(p / LEVEL_POINTS_PER_SQRT_UNIT)) + 1;
}

export function pointsForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return LEVEL_POINTS_PER_SQRT_UNIT * (l - 1) ** 2;
}

export function levelProgressPercent(points: number): number {
  const p = Math.max(0, points);
  const current = levelForPoints(p);
  const pCurrent = pointsForLevel(current);
  const pNext = pointsForLevel(current + 1);
  if (pNext <= pCurrent) return 0;
  const ratio = (p - pCurrent) / (pNext - pCurrent);
  return Math.max(0, Math.min(100, ratio * 100));
}

export interface LevelWindow {
  firstLevel: number;
  lastLevel: number;
  currentLevel: number;
}

export function levelWindow(
  points: number,
  completed: number = COMPLETED_LEVEL_WINDOW,
  upcoming: number = UPCOMING_LEVEL_WINDOW
): LevelWindow {
  const currentLevel = levelForPoints(points);
  const firstLevel = Math.max(1, currentLevel - completed + 1);
  const lastLevel = currentLevel + upcoming;
  return { firstLevel, lastLevel, currentLevel };
}

export function isChestLevel(level: number): boolean {
  return level > 0 && level % CHEST_INTERVAL === 0;
}

export type LevelState = "completed" | "current" | "locked";

export function levelStateFor(level: number, currentLevel: number): LevelState {
  if (level < currentLevel) return "completed";
  if (level === currentLevel) return "current";
  return "locked";
}
