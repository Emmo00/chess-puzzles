export function calculatePoints(attempts: number): number {
  if (attempts === 1) return 100;
  if (attempts === 2) return 66;
  if (attempts === 3) return 33;
  return 10;
}