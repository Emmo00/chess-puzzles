import type { League } from "../leagues";

export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  displayName: string;
  totalPuzzlesSolved: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  seasonPoints: number;
  rankScore: number;
  league: League;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  total: number;
  page: number;
  limit: number;
  userRank?: LeaderboardEntry | null;
  userLeague?: League | null;
  seasonStart: string;
  seasonEnd: string;
}
