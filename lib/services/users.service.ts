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

    let newStreak = user.currentStreak;
    let newFreezes = user.streakFreezes ?? 1;

    if (lastPuzzleUtcDay !== currentUtcDay) {
      if (lastPuzzleUtcDay === null) {
        newStreak = 1;
      } else if (lastPuzzleUtcDay === currentUtcDay - 1) {
        newStreak += 1;
      } else {
        if (newFreezes > 0) {
          newFreezes -= 1;
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      }
    }

    const newLongest = Math.max(user.longestStreak, newStreak);

    const updated = await this.users.findOneAndUpdate(
      query,
      {
        $set: {
          currentStreak: newStreak,
          longestStreak: newLongest,
          streakFreezes: newFreezes,
          lastLogin: playedAt,
          lastPuzzleDate: playedAt.toISOString(),
        },
      },
      { new: true }
    );

    if (!updated) throw new HttpException(404, "User not found");
    return updated;
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
