import { describe, expect, it } from "vitest";
import {
  basePointsForRating,
  speedMultiplier,
  streakMultiplier,
  calculatePuzzleRushPuzzleScore,
} from "@/lib/puzzle-rush/scoring";

describe("basePointsForRating", () => {
  it("uses 50 for ratings under 1000", () => {
    expect(basePointsForRating(0)).toBe(50);
    expect(basePointsForRating(500)).toBe(50);
    expect(basePointsForRating(999)).toBe(50);
  });

  it("uses 75 for 1000-1199", () => {
    expect(basePointsForRating(1000)).toBe(75);
    expect(basePointsForRating(1199)).toBe(75);
  });

  it("uses 100 for 1200-1399", () => {
    expect(basePointsForRating(1200)).toBe(100);
    expect(basePointsForRating(1399)).toBe(100);
  });

  it("uses 125 for 1400-1599", () => {
    expect(basePointsForRating(1400)).toBe(125);
    expect(basePointsForRating(1599)).toBe(125);
  });

  it("uses 150 for 1600-1799", () => {
    expect(basePointsForRating(1600)).toBe(150);
    expect(basePointsForRating(1799)).toBe(150);
  });

  it("uses 175 for 1800-1999", () => {
    expect(basePointsForRating(1800)).toBe(175);
    expect(basePointsForRating(1999)).toBe(175);
  });

  it("uses 200 for 2000-2199", () => {
    expect(basePointsForRating(2000)).toBe(200);
    expect(basePointsForRating(2199)).toBe(200);
  });

  it("uses 250 for 2200+", () => {
    expect(basePointsForRating(2200)).toBe(250);
    expect(basePointsForRating(3000)).toBe(250);
  });
});

describe("speedMultiplier", () => {
  it("is 1.50 at 5s and under", () => {
    expect(speedMultiplier(1)).toBe(1.5);
    expect(speedMultiplier(5)).toBe(1.5);
  });

  it("is 1.25 from 6-10s", () => {
    expect(speedMultiplier(6)).toBe(1.25);
    expect(speedMultiplier(10)).toBe(1.25);
  });

  it("is 1.10 from 11-20s", () => {
    expect(speedMultiplier(11)).toBe(1.1);
    expect(speedMultiplier(20)).toBe(1.1);
  });

  it("is 1.00 from 21-30s", () => {
    expect(speedMultiplier(21)).toBe(1.0);
    expect(speedMultiplier(30)).toBe(1.0);
  });

  it("is 0.90 above 30s", () => {
    expect(speedMultiplier(31)).toBe(0.9);
    expect(speedMultiplier(300)).toBe(0.9);
  });
});

describe("streakMultiplier", () => {
  it("is 1.00 for streaks 1-2", () => {
    expect(streakMultiplier(1)).toBe(1.0);
    expect(streakMultiplier(2)).toBe(1.0);
  });

  it("is 1.10 for streaks 3-4", () => {
    expect(streakMultiplier(3)).toBe(1.1);
    expect(streakMultiplier(4)).toBe(1.1);
  });

  it("is 1.20 for streaks 5-6", () => {
    expect(streakMultiplier(5)).toBe(1.2);
    expect(streakMultiplier(6)).toBe(1.2);
  });

  it("is 1.30 for streaks 7-9", () => {
    expect(streakMultiplier(7)).toBe(1.3);
    expect(streakMultiplier(9)).toBe(1.3);
  });

  it("is 1.50 for streaks 10+", () => {
    expect(streakMultiplier(10)).toBe(1.5);
    expect(streakMultiplier(25)).toBe(1.5);
  });

  it("clamps below 1 to 1 streak", () => {
    expect(streakMultiplier(0)).toBe(1.0);
  });
});

describe("calculatePuzzleRushPuzzleScore", () => {
  it("matches the documented example: 1700 / 8s / streak 6 = 225", () => {
    const result = calculatePuzzleRushPuzzleScore({
      rating: 1700,
      solveTimeSec: 8,
      streakCount: 6,
    });
    expect(result).toBe(225);
  });

  it("fast hard puzzle with a big streak scores highest", () => {
    const result = calculatePuzzleRushPuzzleScore({
      rating: 2500,
      solveTimeSec: 3,
      streakCount: 12,
    });
    expect(result).toBe(Math.round(250 * 1.5 * 1.5));
  });

  it("a slow easy puzzle on a fresh streak scores lowest", () => {
    const result = calculatePuzzleRushPuzzleScore({
      rating: 800,
      solveTimeSec: 45,
      streakCount: 1,
    });
    expect(result).toBe(Math.round(50 * 0.9 * 1.0));
  });

  it("never returns negative points", () => {
    const result = calculatePuzzleRushPuzzleScore({
      rating: 0,
      solveTimeSec: 9999,
      streakCount: 0,
    });
    expect(result).toBeGreaterThanOrEqual(0);
  });
});