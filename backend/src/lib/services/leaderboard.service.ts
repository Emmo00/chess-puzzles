import { User as userModel, UserPuzzle as userPuzzleModel } from "@workspace/db";
import {
  getCurrentSeasonStart,
  getCurrentSeasonEnd,
  getLeague,
  leaderboardRankScore,
  compareLeaderboardEntries,
  type League,
} from "../leagues";

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

interface SeasonAggRow {
  _id: string;
  seasonPoints: number;
  firstSolvedAt: Date;
}

class LeaderboardService {
  public users = userModel;

  async getLeaderboard(
    page: number = 1,
    limit: number = 50,
    userWalletAddress?: string,
    leagueFilter?: League | null
  ): Promise<LeaderboardResponse> {
    const seasonStart = getCurrentSeasonStart();
    const seasonEnd = getCurrentSeasonEnd();

    const seasonRows: SeasonAggRow[] = await userPuzzleModel.aggregate<SeasonAggRow>([
      {
        $match: {
          completed: true,
          solvedAt: { $gte: seasonStart, $lte: seasonEnd },
        },
      },
      {
        $group: {
          _id: "$userWalletAddress",
          seasonPoints: { $sum: "$points" },
          firstSolvedAt: { $min: "$solvedAt" },
        },
      },
    ]);

    if (seasonRows.length === 0) {
      return {
        leaderboard: [],
        total: 0,
        page,
        limit,
        userRank: null,
        userLeague: null,
        seasonStart: seasonStart.toISOString(),
        seasonEnd: seasonEnd.toISOString(),
      };
    }

    const walletKeys = seasonRows.map((row) => row._id.toLowerCase());
    const users = await this.users
      .find({ walletAddress: { $in: walletKeys } })
      .select(
        "walletAddress displayName totalPuzzlesSolved totalPoints currentStreak longestStreak"
      )
      .lean();

    const userByKey = new Map<string, any>();
    for (const user of users) {
      userByKey.set((user.walletAddress || "").toLowerCase(), user);
    }

    type Ranked = {
      walletAddress: string;
      displayName: string;
      totalPuzzlesSolved: number;
      totalPoints: number;
      currentStreak: number;
      longestStreak: number;
      seasonPoints: number;
      rankScore: number;
      firstReachedAt: number;
      streak: number;
    };

    const ranked: Ranked[] = seasonRows
      .map((row): Ranked | null => {
        const user = userByKey.get(row._id.toLowerCase());
        if (!user) return null;
        const streak = user.currentStreak || 0;
        const seasonPoints = row.seasonPoints || 0;
        return {
          walletAddress: user.walletAddress,
          displayName: user.displayName || user.walletAddress?.slice(0, 8) || "Anonymous",
          totalPuzzlesSolved: user.totalPuzzlesSolved || 0,
          totalPoints: user.totalPoints || 0,
          currentStreak: streak,
          longestStreak: user.longestStreak || 0,
          seasonPoints,
          rankScore: leaderboardRankScore(seasonPoints, streak),
          firstReachedAt: row.firstSolvedAt ? new Date(row.firstSolvedAt).getTime() : Number.MAX_SAFE_INTEGER,
          streak,
        };
      })
      .filter((row): row is Ranked => row !== null);

    ranked.sort((a, b) =>
      compareLeaderboardEntries(a, a.rankScore, b, b.rankScore)
    );

    let userLeague: League | null = null;
    if (userWalletAddress) {
      const lower = userWalletAddress.toLowerCase();
      const userRow = ranked.find((row) => row.walletAddress?.toLowerCase() === lower);
      if (userRow) {
        userLeague = getLeague(userRow.totalPoints, userRow.currentStreak);
      }
    }

    const filtered = leagueFilter
      ? ranked.filter(
          (row) => getLeague(row.totalPoints, row.currentStreak) === leagueFilter
        )
      : ranked;

    const total = filtered.length;
    const skip = (page - 1) * limit;
    const pageRows = filtered.slice(skip, skip + limit);

    const leaderboard: LeaderboardEntry[] = pageRows.map((row, index) => ({
      rank: skip + index + 1,
      walletAddress: row.walletAddress,
      displayName: row.displayName,
      totalPuzzlesSolved: row.totalPuzzlesSolved,
      totalPoints: row.totalPoints,
      currentStreak: row.currentStreak,
      longestStreak: row.longestStreak,
      seasonPoints: row.seasonPoints,
      rankScore: row.rankScore,
      league: getLeague(row.totalPoints, row.currentStreak),
    }));

    let userRank: LeaderboardEntry | null = null;
    if (userWalletAddress) {
      const lower = userWalletAddress.toLowerCase();
      const idx = filtered.findIndex((row) => row.walletAddress?.toLowerCase() === lower);
      if (idx >= 0) {
        const row = filtered[idx];
        userRank = {
          rank: idx + 1,
          walletAddress: row.walletAddress,
          displayName: row.displayName,
          totalPuzzlesSolved: row.totalPuzzlesSolved,
          totalPoints: row.totalPoints,
          currentStreak: row.currentStreak,
          longestStreak: row.longestStreak,
          seasonPoints: row.seasonPoints,
          rankScore: row.rankScore,
          league: getLeague(row.totalPoints, row.currentStreak),
        };
      }
    }

    return {
      leaderboard,
      total,
      page,
      limit,
      userRank,
      userLeague,
      seasonStart: seasonStart.toISOString(),
      seasonEnd: seasonEnd.toISOString(),
    };
  }
}

export default LeaderboardService;
