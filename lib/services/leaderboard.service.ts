import userModel from "../models/users.model";

export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  displayName: string;
  totalPuzzlesSolved: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  total: number;
  page: number;
  limit: number;
  userRank?: LeaderboardEntry | null;
}

class LeaderboardService {
  public users = userModel;

  /**
   * Get leaderboard ranked by puzzles solved (primary) and points (secondary)
   */
  async getLeaderboard(
    page: number = 1,
    limit: number = 50,
    userWalletAddress?: string
  ): Promise<LeaderboardResponse> {
    const skip = (page - 1) * limit;

    // Get total count of users with at least 1 puzzle solved
    const total = await this.users.countDocuments({ totalPuzzlesSolved: { $gt: 0 } });

    // Get leaderboard sorted by puzzles solved (desc), then points (desc)
    const users = await this.users
      .find({ totalPuzzlesSolved: { $gt: 0 } })
      .sort({ totalPuzzlesSolved: -1, totalPoints: -1 })
      .skip(skip)
      .limit(limit)
      .select("walletAddress displayName totalPuzzlesSolved totalPoints currentStreak longestStreak")
      .lean();

    const leaderboard: LeaderboardEntry[] = users.map((user: any, index: number) => ({
      rank: skip + index + 1,
      walletAddress: user.walletAddress,
      displayName: user.displayName || user.walletAddress?.slice(0, 8) || "Anonymous",
      totalPuzzlesSolved: user.totalPuzzlesSolved || 0,
      totalPoints: user.totalPoints || 0,
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
    }));

    // Get user's rank if wallet address provided
    let userRank: LeaderboardEntry | null = null;
    if (userWalletAddress) {
      userRank = await this.getUserRank(userWalletAddress);
    }

    return {
      leaderboard,
      total,
      page,
      limit,
      userRank,
    };
  }

  /**
   * Get a specific user's rank
   */
  async getUserRank(walletAddress: string): Promise<LeaderboardEntry | null> {
    const user = await this.users
      .findOne({ walletAddress: walletAddress.toLowerCase() })
      .select("walletAddress displayName totalPuzzlesSolved totalPoints currentStreak longestStreak")
      .lean();

    if (!user || !user.totalPuzzlesSolved || user.totalPuzzlesSolved === 0) {
      return null;
    }

    // Count users with more puzzles solved, or same puzzles but more points
    const rank = await this.users.countDocuments({
      $or: [
        { totalPuzzlesSolved: { $gt: user.totalPuzzlesSolved } },
        {
          totalPuzzlesSolved: user.totalPuzzlesSolved,
          totalPoints: { $gt: user.totalPoints || 0 },
        },
      ],
    });

    return {
      rank: rank + 1,
      walletAddress: (user as any).walletAddress,
      displayName: (user as any).displayName || (user as any).walletAddress?.slice(0, 8) || "Anonymous",
      totalPuzzlesSolved: (user as any).totalPuzzlesSolved || 0,
      totalPoints: (user as any).totalPoints || 0,
      currentStreak: (user as any).currentStreak || 0,
      longestStreak: (user as any).longestStreak || 0,
    };
  }
}

export default LeaderboardService;
