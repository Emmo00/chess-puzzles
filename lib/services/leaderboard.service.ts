import userModel from "../models/users.model";

class LeaderboardService {
  public users = userModel;

  /**
   * Get leaderboard for points or total puzzles solved, paginated, with optional friends filter.
   * @param category 'points' | 'totalPuzzlesSolved' | 'solved'
   * @param filter 'global' | 'friends'
   * @param userIdentifier current user's wallet address or fid
   * @param page page number (1-based)
   * @param limit page size
   */
  public async getLeaderboard({
    category,
    filter = "global",
    userFid,
    page = 1,
    limit = 10,
  }: {
    category: "points" | "totalPuzzlesSolved" | "solved",
    filter: string,
    userFid?: string | number, // Updated to support wallet addresses
    page: number,
    limit: number,
  }) {
    let query: any = {};
    
    // Map category to actual field name
    const fieldName = category === 'solved' ? 'puzzles_solved' : 
                     category === 'points' ? 'total_points' : 
                     category;
    
    // Exclude users with zero points/solved
    query[fieldName] = { $gt: 0 };
    
    if (filter === "friends" && userFid) {
      // For wallet-based users, skip friends filter for now
      if (typeof userFid === 'string') {
        // Wallet address - no friends support yet
      } else {
        // Legacy FID - fetch friend FIDs from Neynar best friends API
        const friends = await this.getBestFriendsFids(userFid);
        query.fid = { $in: friends };
      }
    }
    
    // Sort by field desc
    const sort: any = {};
    sort[fieldName] = -1;
    // Pagination
    const skip = (page - 1) * limit;
    const users = await this.users.find(query).sort(sort).skip(skip).limit(limit).lean();
    // Total count for pagination
    const total = await this.users.countDocuments(query);

    // Get current user's value and rank
    let currentUser = null;
    let currentRank = null;
    let currentValue = null;
    if (userFid) {
      currentUser = await this.users.findOne({ fid: userFid });
      if (currentUser && currentUser[category] > 0) {
        // Count users with more value than current user
        const betterCount = await this.users.countDocuments({
          ...query,
          [category]: { $gt: currentUser[category] },
        });
        currentRank = betterCount + 1;
        currentValue = currentUser[category];
      }
    }

    return {
      users,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      currentUser: userFid ? {
        fid: userFid,
        rank: currentRank,
        value: currentValue,
      } : null,
    };
  }

  /**
   * Fetch best friends' FIDs for a user from Neynar API
   */
  private async getBestFriendsFids(fid: number): Promise<number[]> {
    const apiKey = process.env.NEYNAR_API_KEY || "NEYNAR_API_DOCS";
    const url = `https://api.neynar.com/v2/farcaster/user/best_friends/?fid=${fid}&limit=100`;
    const res = await fetch(url, {
      headers: { "x-api-key": apiKey },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.users || []).map((u: any) => u.fid);
  }
}

export default LeaderboardService;