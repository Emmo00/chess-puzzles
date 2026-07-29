import { WalletUser, UserStats, UserSettings } from "../types";
import userModel from "../models/users.model";
import { getUtcDayNumber } from "@/lib/utils/time";
import { generateDisplayName } from "../utils/nameGenerator";
import { getAccessConfig } from "../config/access";

export class HttpException extends Error {
  status: number;
  message: string;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.message = message;
  }
}

// Default settings for new users (empty disabledThemes = all themes enabled)
const DEFAULT_SETTINGS: UserSettings = {
  ratingRange: { min: 800, max: 2000 },
  disabledThemes: [],
};

class UserService {
  public users = userModel;

  public async ensureUser(walletAddress: string) {
    const lower = walletAddress.toLowerCase();
    const { defaultHints, defaultStreakFreezes } = await getAccessConfig();
    await this.users.updateOne(
      { walletAddress: lower },
      {
        $setOnInsert: {
          walletAddress: lower,
          displayName: generateDisplayName(lower),
          hintBalance: defaultHints,
          streakFreezes: defaultStreakFreezes,
        },
      },
      { upsert: true }
    );
    return this.users.findOne({ walletAddress: lower });
  }

  // Backward compatibility method for FID-based queries
  public async getUser(identifier: string): Promise<WalletUser & UserStats> {
    let user = await this.users.findOne({ walletAddress: identifier.toLowerCase() });

    if (!user) {
      throw new HttpException(404, "User not found");
    }
    return user;
  }

  public async updateUserStreakByUTCDay(identifier: string, playedAt: Date = new Date()) {
    const query = { walletAddress: identifier.toLowerCase() };
    const user = await this.users.findOne(query).lean();

    if (!user) {
      throw new HttpException(404, "User not found");
    }

    const currentUtcDay = getUtcDayNumber(playedAt);
    const lastPuzzleUtcDay = user.lastPuzzleDate
      ? getUtcDayNumber(new Date(user.lastPuzzleDate))
      : null;

    // Already solved today — no change
    if (lastPuzzleUtcDay === currentUtcDay) {
      return this.users.findOne(query);
    }

    // First solve ever
    if (lastPuzzleUtcDay === null) {
      const updated = await this.users.findOneAndUpdate(
        query,
        {
          $set: {
            currentStreak: 1,
            longestStreak: Math.max(user.longestStreak, 1),
            lastLogin: playedAt,
            lastPuzzleDate: playedAt.toISOString(),
            "streakEvent.eventType": null,
            "streakEvent.day": null,
            "streakEvent.notified": false,
          },
        },
        { new: true }
      );
      if (!updated) throw new HttpException(404, "User not found");
      return updated;
    }

    // Consecutive day — increment streak
    if (lastPuzzleUtcDay === currentUtcDay - 1) {
      const newStreak = (user.currentStreak ?? 0) + 1;
      const newLongest = Math.max(user.longestStreak ?? 0, newStreak);
      const updated = await this.users.findOneAndUpdate(
        query,
        {
          $set: {
            currentStreak: newStreak,
            longestStreak: newLongest,
            lastLogin: playedAt,
            lastPuzzleDate: playedAt.toISOString(),
          },
        },
        { new: true }
      );
      if (!updated) throw new HttpException(404, "User not found");
      return updated;
    }

    // Gap > 1 day — use optimistic lock on lastPuzzleDate to prevent races
    const oldLastPuzzleDate = user.lastPuzzleDate;
    const newStreak = (user.currentStreak ?? 0) + 1;
    const newLongest = Math.max(user.longestStreak ?? 0, newStreak);

    // Try to consume a streak freeze atomically
    if ((user.streakFreezes ?? 0) > 0) {
      const freezeResult = await this.users.findOneAndUpdate(
        {
          ...query,
          streakFreezes: { $gt: 0 },
          lastPuzzleDate: oldLastPuzzleDate,
        },
        {
          $inc: { streakFreezes: -1, currentStreak: 1 },
          $set: {
            longestStreak: newLongest,
            lastLogin: playedAt,
            lastPuzzleDate: playedAt.toISOString(),
            "streakEvent.eventType": "freeze_used",
            "streakEvent.day": currentUtcDay,
            "streakEvent.notified": false,
          },
        },
        { new: true }
      );
      if (freezeResult) return freezeResult;
      // Race lost — another request already processed this day
      return this.users.findOne(query);
    }

    // No streak freeze available — streak resets
    const resetResult = await this.users.findOneAndUpdate(
      {
        ...query,
        lastPuzzleDate: oldLastPuzzleDate,
      },
      {
        $set: {
          currentStreak: 1,
          longestStreak: newLongest,
          lastLogin: playedAt,
          lastPuzzleDate: playedAt.toISOString(),
          "streakEvent.eventType": "streak_lost",
          "streakEvent.day": currentUtcDay,
          "streakEvent.notified": false,
        },
      },
      { new: true }
    );
    if (!resetResult) {
      // Race lost — return current state
      return this.users.findOne(query);
    }
    return resetResult;
  }

  public async updateUserStats(identifier: string, stats: Partial<UserStats>): Promise<WalletUser | null> {
    let query = { walletAddress: identifier.toLowerCase() };

    const updatedUser = await this.users.findOneAndUpdate(query, stats, { new: true });
    if (!updatedUser) {
      throw new HttpException(404, "User not found");
    }

    return {
      walletAddress: updatedUser.walletAddress || "",
      displayName: updatedUser.displayName || "",
      username: updatedUser.username,
    };
  }

  public async getUserSettings(walletAddress: string): Promise<UserSettings> {
    const user = await this.users.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      // Return default settings for non-existent users
      return DEFAULT_SETTINGS;
    }

    // Return user settings or defaults if not set
    return {
      ratingRange: user.settings?.ratingRange || DEFAULT_SETTINGS.ratingRange,
      disabledThemes: user.settings?.disabledThemes || DEFAULT_SETTINGS.disabledThemes,
    };
  }

  public async updateUserSettings(walletAddress: string, settings: Partial<UserSettings>): Promise<UserSettings> {
    const updateData: any = {};

    if (settings.ratingRange) {
      updateData["settings.ratingRange"] = {
        min: Math.max(400, Math.min(3000, settings.ratingRange.min)),
        max: Math.max(400, Math.min(3000, settings.ratingRange.max)),
      };
    }

    if (settings.disabledThemes !== undefined) {
      updateData["settings.disabledThemes"] = settings.disabledThemes;
    }

    const updatedUser = await this.users.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      { $set: updateData },
      { new: true, upsert: false }
    );

    if (!updatedUser) {
      throw new HttpException(404, "User not found");
    }

    return {
      ratingRange: updatedUser.settings?.ratingRange || DEFAULT_SETTINGS.ratingRange,
      disabledThemes: updatedUser.settings?.disabledThemes || DEFAULT_SETTINGS.disabledThemes,
    };
  }

  public async linkFarcasterFid(walletAddress: string, fid: number) {
    const updatedUser = await this.users.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      { $set: { fid } },
      { new: true }
    );

    if (!updatedUser) {
      throw new HttpException(404, "User not found");
    }

    return updatedUser;
  }
}

export default UserService;
