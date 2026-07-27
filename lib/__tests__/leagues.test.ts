import { describe, expect, it } from "vitest";
import {
  getCurrentSeasonStart,
  getCurrentSeasonEnd,
  seasonId,
  getLeague,
  leaderboardRankScore,
  compareLeaderboardEntries,
  LEAGUES,
} from "@/lib/leagues";

describe("season windows", () => {
  it("returns Monday 00:00 UTC for a Wednesday", () => {
    const wednesday = new Date(Date.UTC(2026, 6, 8, 12, 30, 0));
    const start = getCurrentSeasonStart(wednesday);
    expect(start.getUTCDay()).toBe(1);
    expect(start.toISOString()).toBe("2026-07-06T00:00:00.000Z");
  });

  it("returns the previous Monday for a Sunday", () => {
    const sunday = new Date(Date.UTC(2026, 6, 12, 23, 59, 0));
    const start = getCurrentSeasonStart(sunday);
    expect(start.toISOString()).toBe("2026-07-06T00:00:00.000Z");
  });

  it("ends the season just before the next Monday", () => {
    const wednesday = new Date(Date.UTC(2026, 6, 8, 12, 30, 0));
    const end = getCurrentSeasonEnd(wednesday);
    expect(end.toISOString()).toBe("2026-07-12T23:59:59.999Z");
  });

  it("uses a stable season id within the same week", () => {
    const monday = new Date(Date.UTC(2026, 6, 6, 0, 0, 0));
    const sunday = new Date(Date.UTC(2026, 6, 12, 23, 59, 59));
    expect(seasonId(monday)).toBe(seasonId(sunday));
  });

  it("advances the season id across the Monday boundary", () => {
    const thisSunday = new Date(Date.UTC(2026, 6, 12, 23, 59, 59));
    const nextMonday = new Date(Date.UTC(2026, 6, 13, 0, 0, 0));
    expect(seasonId(nextMonday)).toBeGreaterThan(seasonId(thisSunday));
  });
});

describe("getLeague", () => {
  it("places new players in Pawn", () => {
    expect(getLeague(0, 0)).toBe("pawn");
    expect(getLeague(749, 20)).toBe("pawn");
    expect(getLeague(2000, 6)).toBe("pawn");
  });

  it("promotes to Knight at 750 points and 7+ streak", () => {
    expect(getLeague(750, 7)).toBe("knight");
    expect(getLeague(1200, 10)).toBe("knight");
  });

  it("promotes to King at 1800 points and 14+ streak", () => {
    expect(getLeague(1800, 14)).toBe("king");
    expect(getLeague(5000, 30)).toBe("king");
  });

  it("places a high-point player with low streak in Pawn (streak gate not met)", () => {
    expect(getLeague(3000, 5)).toBe("pawn");
  });

  it("keeps a high-point player in Knight (below King streak) when streak >= 7", () => {
    expect(getLeague(3000, 10)).toBe("knight");
  });

  it("respects league thresholds from LEAGUES config", () => {
    expect(LEAGUES.king.minSeasonPoints).toBe(1800);
    expect(LEAGUES.king.minStreak).toBe(14);
    expect(LEAGUES.knight.minSeasonPoints).toBe(750);
    expect(LEAGUES.knight.minStreak).toBe(7);
  });
});

describe("leaderboardRankScore", () => {
  it("is season points with no streak bonus at 0 streak", () => {
    expect(leaderboardRankScore(500, 0)).toBe(500);
  });

  it("adds 10 per streak day capped at +100", () => {
    expect(leaderboardRankScore(500, 3)).toBe(530);
    expect(leaderboardRankScore(500, 10)).toBe(600);
    expect(leaderboardRankScore(500, 20)).toBe(600);
  });

  it("never returns negative", () => {
    expect(leaderboardRankScore(-10, 0)).toBe(0);
  });
});

describe("compareLeaderboardEntries", () => {
  it("ranks higher score first", () => {
    const a = { seasonPoints: 100, streak: 1 };
    const b = { seasonPoints: 200, streak: 1 };
    expect(compareLeaderboardEntries(a, leaderboardRankScore(100, 1), b, leaderboardRankScore(200, 1))).toBeGreaterThan(0);
  });

  it("tie-breaks by season points when scores are equal", () => {
    const a = { seasonPoints: 150, streak: 5 };
    const b = { seasonPoints: 100, streak: 10 };
    const scoreA = leaderboardRankScore(150, 5);
    const scoreB = leaderboardRankScore(100, 10);
    expect(scoreA).toBe(scoreB);
    expect(compareLeaderboardEntries(a, scoreA, b, scoreB)).toBeLessThan(0);
  });

  it("tie-breaks by streak when score and points are equal", () => {
    const a = { seasonPoints: 100, streak: 3 };
    const b = { seasonPoints: 100, streak: 5 };
    expect(compareLeaderboardEntries(a, leaderboardRankScore(100, 3), b, leaderboardRankScore(100, 5))).toBeGreaterThan(0);
  });

  it("tie-breaks by earlier firstReachedAt", () => {
    const a = { seasonPoints: 100, streak: 1, firstReachedAt: 1000 };
    const b = { seasonPoints: 100, streak: 1, firstReachedAt: 2000 };
    expect(compareLeaderboardEntries(a, leaderboardRankScore(100, 1), b, leaderboardRankScore(100, 1))).toBeLessThan(0);
  });
});
