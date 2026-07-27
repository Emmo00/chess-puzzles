import { describe, expect, it } from "vitest";
import {
  calculateEarnedPoints,
  getBasePoints,
  getHintPenalty,
  isFailed,
  streakMultiplier,
  speedBonus,
  calculatePointsLegacy,
  type ScoringConfig,
} from "@/lib/scoring";
import { SCORING_CONFIG } from "@/lib/config/scoring";

const CONFIG: ScoringConfig = SCORING_CONFIG;

describe("getBasePoints", () => {
  it("uses 100 for standard puzzles", () => {
    expect(getBasePoints("standard", CONFIG)).toBe(100);
  });

  it("uses 200 for daily puzzles", () => {
    expect(getBasePoints("daily", CONFIG)).toBe(200);
  });
});

describe("isFailed", () => {
  it("fails only at the 3-hint threshold", () => {
    expect(isFailed(0, CONFIG)).toBe(false);
    expect(isFailed(1, CONFIG)).toBe(false);
    expect(isFailed(2, CONFIG)).toBe(false);
    expect(isFailed(3, CONFIG)).toBe(true);
    expect(isFailed(5, CONFIG)).toBe(true);
  });
});

describe("getHintPenalty", () => {
  it("applies -30 for the first hint", () => {
    expect(getHintPenalty(1, CONFIG)).toBe(30);
  });

  it("applies -60 for the second hint (cumulative value)", () => {
    expect(getHintPenalty(2, CONFIG)).toBe(60);
  });

  it("applies 0 penalty with no hints", () => {
    expect(getHintPenalty(0, CONFIG)).toBe(0);
  });

  it("applies 0 penalty on the fail case (handled separately)", () => {
    expect(getHintPenalty(3, CONFIG)).toBe(0);
  });
});

describe("streakMultiplier", () => {
  it("is 1.0 for a single solve (streak 1)", () => {
    expect(streakMultiplier(1, CONFIG)).toBe(1.0);
  });

  it("is 1.2 for a 3-day streak", () => {
    expect(streakMultiplier(3, CONFIG)).toBe(1.2);
  });

  it("is 1.5 at the cap (5+ streak)", () => {
    expect(streakMultiplier(5, CONFIG)).toBe(1.5);
    expect(streakMultiplier(7, CONFIG)).toBe(1.5);
    expect(streakMultiplier(100, CONFIG)).toBe(1.5);
  });

  it("never exceeds the cap", () => {
    expect(streakMultiplier(99, CONFIG)).toBeLessThanOrEqual(1.5);
  });

  it("handles 0 streak as 1.0", () => {
    expect(streakMultiplier(0, CONFIG)).toBe(1.0);
  });
});

describe("speedBonus", () => {
  it("grants +25 when solved within 15s with 0 hints", () => {
    expect(speedBonus(0, 5, CONFIG)).toBe(25);
    expect(speedBonus(0, 15, CONFIG)).toBe(25);
  });

  it("grants no bonus past the 15s threshold", () => {
    expect(speedBonus(0, 16, CONFIG)).toBe(0);
    expect(speedBonus(0, 30, CONFIG)).toBe(0);
  });

  it("grants no bonus when hints were used", () => {
    expect(speedBonus(1, 5, CONFIG)).toBe(0);
    expect(speedBonus(2, 3, CONFIG)).toBe(0);
  });

  it("grants no bonus for non-positive time", () => {
    expect(speedBonus(0, 0, CONFIG)).toBe(0);
    expect(speedBonus(0, -1, CONFIG)).toBe(0);
  });
});

describe("calculateEarnedPoints (master formula)", () => {
  it("awards full base points for a clean fast solve on streak 1", () => {
    const result = calculateEarnedPoints({
      kind: "standard",
      hintCount: 0,
      streak: 1,
      solveTimeSec: 10,
      config: CONFIG,
    });
    expect(result.points).toBe(125);
    expect(result.failed).toBe(false);
    expect(result.speedBonus).toBe(25);
    expect(result.streakMultiplier).toBe(1.0);
  });

  it("awards base only when slow with no speed bonus", () => {
    const result = calculateEarnedPoints({
      kind: "standard",
      hintCount: 0,
      streak: 1,
      solveTimeSec: 60,
      config: CONFIG,
    });
    expect(result.points).toBe(100);
    expect(result.speedBonus).toBe(0);
  });

  it("applies streak multiplier with a 3-day streak", () => {
    const result = calculateEarnedPoints({
      kind: "standard",
      hintCount: 0,
      streak: 3,
      solveTimeSec: 60,
      config: CONFIG,
    });
    expect(result.points).toBe(Math.floor(100 * 1.2));
    expect(result.streakMultiplier).toBe(1.2);
  });

  it("combines streak and speed bonus", () => {
    const result = calculateEarnedPoints({
      kind: "standard",
      hintCount: 0,
      streak: 3,
      solveTimeSec: 12,
      config: CONFIG,
    });
    expect(result.points).toBe(Math.floor(100 * 1.2) + 25);
  });

  it("applies the first hint penalty (-30)", () => {
    const result = calculateEarnedPoints({
      kind: "standard",
      hintCount: 1,
      streak: 1,
      solveTimeSec: 5,
      config: CONFIG,
    });
    expect(result.points).toBe(Math.floor((100 - 30) * 1.0));
    expect(result.speedBonus).toBe(0);
  });

  it("applies the second hint penalty (-60)", () => {
    const result = calculateEarnedPoints({
      kind: "standard",
      hintCount: 2,
      streak: 1,
      solveTimeSec: 5,
      config: CONFIG,
    });
    expect(result.points).toBe(Math.floor((100 - 60) * 1.0));
  });

  it("fails and scores 0 at 3 hints (no streak/speed applied)", () => {
    const result = calculateEarnedPoints({
      kind: "standard",
      hintCount: 3,
      streak: 5,
      solveTimeSec: 5,
      config: CONFIG,
    });
    expect(result.failed).toBe(true);
    expect(result.points).toBe(0);
    expect(result.streakMultiplier).toBe(0);
    expect(result.speedBonus).toBe(0);
  });

  it("uses 200 base for daily challenges", () => {
    const result = calculateEarnedPoints({
      kind: "daily",
      hintCount: 0,
      streak: 1,
      solveTimeSec: 60,
      config: CONFIG,
    });
    expect(result.base).toBe(200);
    expect(result.points).toBe(200);
  });

  it("never returns negative points", () => {
    const result = calculateEarnedPoints({
      kind: "standard",
      hintCount: 2,
      streak: 1,
      solveTimeSec: 60,
      config: { ...CONFIG, basePointsStandard: 50 },
    });
    expect(result.points).toBeGreaterThanOrEqual(0);
  });

  it("caps streak multiplier at 1.5 for 5+ streaks in the full formula", () => {
    const result = calculateEarnedPoints({
      kind: "standard",
      hintCount: 0,
      streak: 6,
      solveTimeSec: 60,
      config: CONFIG,
    });
    expect(result.streakMultiplier).toBe(1.5);
    expect(result.points).toBe(Math.floor(100 * 1.5));
  });
});

describe("calculatePointsLegacy (old formula, kept for parity tests)", () => {
  it("matches the old base/mistake/hint math", () => {
    expect(calculatePointsLegacy({ rating: 1900, mistakes: 0, hintCount: 0 })).toBe(100);
    expect(calculatePointsLegacy({ rating: 1900, mistakes: 1, hintCount: 0 })).toBe(80);
    expect(calculatePointsLegacy({ rating: 1900, mistakes: 2, hintCount: 0 })).toBe(60);
    expect(calculatePointsLegacy({ rating: 1500, mistakes: 0, hintCount: 1 })).toBe(25);
  });
});
