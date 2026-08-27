import { describe, expect, it } from "vitest";
import {
  levelForPoints,
  pointsForLevel,
  levelProgressPercent,
  levelWindow,
  isChestLevel,
  levelStateFor,
} from "@/lib/leveling";

describe("levelForPoints", () => {
  it("returns level 1 for 0 points", () => {
    expect(levelForPoints(0)).toBe(1);
  });

  it("returns level 1 below the 100-point threshold", () => {
    expect(levelForPoints(99)).toBe(1);
  });

  it("returns level 2 at exactly 100 points", () => {
    expect(levelForPoints(100)).toBe(2);
  });

  it("returns level 3 at exactly 400 points", () => {
    expect(levelForPoints(400)).toBe(3);
  });

  it("returns level 4 at exactly 900 points", () => {
    expect(levelForPoints(900)).toBe(4);
  });

  it("returns level 6 at exactly 2500 points", () => {
    expect(levelForPoints(2500)).toBe(6);
  });

  it("treats negative points as 0", () => {
    expect(levelForPoints(-50)).toBe(1);
  });
});

describe("pointsForLevel", () => {
  it("requires 0 points for level 1", () => {
    expect(pointsForLevel(1)).toBe(0);
  });

  it("requires 100 points for level 2", () => {
    expect(pointsForLevel(2)).toBe(100);
  });

  it("requires 400 points for level 3", () => {
    expect(pointsForLevel(3)).toBe(400);
  });

  it("requires 900 points for level 4", () => {
    expect(pointsForLevel(4)).toBe(900);
  });

  it("requires 2500 points for level 6", () => {
    expect(pointsForLevel(6)).toBe(2500);
  });

  it("clamps levels below 1 to level 1", () => {
    expect(pointsForLevel(0)).toBe(0);
    expect(pointsForLevel(-3)).toBe(0);
  });
});

describe("levelProgressPercent", () => {
  it("is 0% at the exact start of a level", () => {
    expect(levelProgressPercent(100)).toBe(0);
  });

  it("is 100% at the exact end of a level (start of next)", () => {
    expect(levelProgressPercent(400)).toBe(0);
  });

  it("is 50% halfway through level 2 (250 points)", () => {
    expect(levelProgressPercent(250)).toBe(50);
  });

  it("is 0% for 0 points", () => {
    expect(levelProgressPercent(0)).toBe(0);
  });

  it("never exceeds 100% or drops below 0%", () => {
    expect(levelProgressPercent(10_000)).toBeLessThanOrEqual(100);
    expect(levelProgressPercent(-5)).toBeGreaterThanOrEqual(0);
  });

  it("midway through level 1 is 50% at 50 points", () => {
    expect(levelProgressPercent(50)).toBe(50);
  });
});

describe("levelWindow", () => {
  it("centers on the current level with defaults", () => {
    const w = levelWindow(900);
    expect(w.currentLevel).toBe(4);
    expect(w.firstLevel).toBe(1);
    expect(w.lastLevel).toBe(24);
  });

  it("keeps first level >= 1", () => {
    const w = levelWindow(0);
    expect(w.firstLevel).toBe(1);
    expect(w.currentLevel).toBe(1);
  });
});

describe("isChestLevel", () => {
  it("marks every 5th level as a chest", () => {
    expect(isChestLevel(5)).toBe(true);
    expect(isChestLevel(10)).toBe(true);
    expect(isChestLevel(25)).toBe(true);
  });

  it("does not mark non-multiples of 5", () => {
    expect(isChestLevel(4)).toBe(false);
    expect(isChestLevel(6)).toBe(false);
    expect(isChestLevel(0)).toBe(false);
  });
});

describe("levelStateFor", () => {
  it("marks lower levels completed", () => {
    expect(levelStateFor(1, 4)).toBe("completed");
  });

  it("marks the current level current", () => {
    expect(levelStateFor(4, 4)).toBe("current");
  });

  it("marks higher levels locked", () => {
    expect(levelStateFor(5, 4)).toBe("locked");
  });
});
