export type League = "pawn" | "knight" | "king";

export interface LeagueMeta {
  id: League;
  name: string;
  badge: string;
  color: string;
  minSeasonPoints: number;
  minStreak: number;
}

export const LEAGUES: Record<League, LeagueMeta> = {
  pawn: {
    id: "pawn",
    name: "Pawn League",
    badge: "♟",
    color: "#e5e5e5",
    minSeasonPoints: 0,
    minStreak: 0,
  },
  knight: {
    id: "knight",
    name: "Knight League",
    badge: "♞",
    color: "#00e5ff",
    minSeasonPoints: 750,
    minStreak: 7,
  },
  king: {
    id: "king",
    name: "King League",
    badge: "♚",
    color: "#ffd600",
    minSeasonPoints: 1800,
    minStreak: 14,
  },
};

export const LEAGUE_ORDER: League[] = ["king", "knight", "pawn"];

export function getCurrentSeasonStart(date: Date = new Date()): Date {
  const utcMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const dayOfWeek = new Date(utcMs).getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  return new Date(utcMs - daysSinceMonday * 86400000);
}

export function getCurrentSeasonEnd(date: Date = new Date()): Date {
  return new Date(getCurrentSeasonStart(date).getTime() + 7 * 86400000 - 1);
}

export function seasonId(date: Date = new Date()): number {
  return getCurrentSeasonStart(date).getTime();
}

export function getLeague(seasonPoints: number, streak: number): League {
  const points = Math.max(0, seasonPoints);
  const s = Math.max(0, streak);
  if (points >= LEAGUES.king.minSeasonPoints && s >= LEAGUES.king.minStreak) {
    return "king";
  }
  if (points >= LEAGUES.knight.minSeasonPoints && s >= LEAGUES.knight.minStreak) {
    return "knight";
  }
  return "pawn";
}

export function leaderboardRankScore(seasonPoints: number, streak: number): number {
  const streakBonus = Math.min(Math.max(0, streak) * 10, 100);
  return Math.max(0, seasonPoints) + streakBonus;
}

export interface LeaderboardRankable {
  seasonPoints: number;
  streak: number;
  firstReachedAt?: number;
}

export function compareLeaderboardEntries(
  a: LeaderboardRankable,
  scoreA: number,
  b: LeaderboardRankable,
  scoreB: number
): number {
  if (scoreB !== scoreA) return scoreB - scoreA;
  if (b.seasonPoints !== a.seasonPoints) return b.seasonPoints - a.seasonPoints;
  if (b.streak !== a.streak) return b.streak - a.streak;
  const aTime = a.firstReachedAt ?? Number.MAX_SAFE_INTEGER;
  const bTime = b.firstReachedAt ?? Number.MAX_SAFE_INTEGER;
  return aTime - bTime;
}
