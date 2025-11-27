import { QuickAuthUser, UserStats } from "../types";
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

  public async createUser(userData: QuickAuthUser): Promise<QuickAuthUser> {
    const user = await this.users.findOne({ fid: userData.fid });
    if (user) {
      return user;
    }

    const newUser = await this.users.create(userData);
    return newUser;
  }

  public async getUser(fid: number) {
    const user = await this.users.findOne({ fid });
    if (!user) {
      throw new HttpException(404, "User not found");
    }
    return user;
  }

  public async updateUserStreak(fid: number) {
    const user = await this.getUser(fid);
    if (!user) {
      throw new HttpException(404, "User not found");
    }

    // Update the user's streak
    const today = new Date();
    const lastLogin = new Date(user.lastLoggedIn);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

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

  public async updateUserStats(
    fid: number,
    stats: Partial<UserStats>
  ): Promise<QuickAuthUser | null> {
    const updatedUser = await this.users.findOneAndUpdate({ fid }, stats, { new: true });
    if (!updatedUser) {
      throw new HttpException(404, "User not found");
    }

    return updatedUser;
  }
}

export default UserService;