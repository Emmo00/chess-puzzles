import { WalletUser, UserStats } from "../types";
import userModel from "../models/users.model";

export class HttpException extends Error {
  status: number;
  message: string;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.message = message;
  }
}

class UserService {
  public users = userModel;

  public async createUser(userData: WalletUser): Promise<WalletUser> {
    const user = await this.users.findOne({ walletAddress: userData.walletAddress.toLowerCase() });
    if (user) {
      return {
        walletAddress: user.walletAddress,
        displayName: user.displayName || userData.displayName,
        username: user.username,
      };
    }

    const newUser = await this.users.create({
      walletAddress: userData.walletAddress.toLowerCase(),
      displayName: userData.displayName,
      username: userData.username,
      totalPoints: 0,
      puzzlesSolved: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastLogin: new Date(),
    });

    return {
      walletAddress: newUser.walletAddress,
      displayName: newUser.displayName,
      username: newUser.username,
    };
  }

  // Backward compatibility method for FID-based queries
  public async getUser(identifier: string): Promise<WalletUser & UserStats> {
    let user = await this.users.findOne({ walletAddress: identifier.toLowerCase() });

    if (!user) {
      throw new HttpException(404, "User not found");
    }
    return user;
  }

  public async updateUserStreak(identifier: string) {
    let query = { walletAddress: identifier.toLowerCase() };

    const user = await this.users.findOne(query);
    if (!user) {
      throw new HttpException(404, "User not found");
    }

    // Update the user's streak
    const today = new Date();
    const lastLogin = new Date(user.lastLogin);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    console.log("Last login date:", lastLogin);
    console.log("Yesterday date:", yesterday);
    console.log("Today date:", today);

    // Normalize times to midnight for comparison
    today.setHours(0, 0, 0, 0);
    lastLogin.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);

    if (lastLogin.getTime() === yesterday.getTime()) {
      user.currentStreak += 1;
    } else {
      user.currentStreak = 1;
    }
    user.longestStreak = Math.max(user.longestStreak, user.currentStreak);
    await user.save();

    return user;
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
}

export default UserService;
