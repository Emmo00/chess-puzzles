import userModel from "../models/users.model";
import { HttpException } from "./users.service";
import UserService from "./users.service";

class HintsService {
  public users = userModel;
  private userService = new UserService();

  async getBalance(walletAddress: string) {
    const lower = walletAddress.toLowerCase();
    const user = await this.userService.ensureUser(lower);
    return {
      hintBalance: user?.hintBalance ?? 0,
      streakFreezes: user?.streakFreezes ?? 0,
    };
  }

  async consumeHint(walletAddress: string): Promise<{ hintBalance: number }> {
    const lower = walletAddress.toLowerCase();
    await this.userService.ensureUser(lower);
    const updated = await this.users.findOneAndUpdate(
      {
        walletAddress: lower,
        hintBalance: { $gt: 0 },
      },
      { $inc: { hintBalance: -1 } },
      { new: true }
    );

    if (!updated) {
      throw new HttpException(400, "No hints available");
    }
    return { hintBalance: updated.hintBalance ?? 0 };
  }

  async grantHints(walletAddress: string, amount: number) {
    const lower = walletAddress.toLowerCase();
    await this.userService.ensureUser(lower);
    const updated = await this.users.findOneAndUpdate(
      { walletAddress: lower },
      { $inc: { hintBalance: Math.max(0, Math.floor(amount)) } },
      { new: true }
    );
    if (!updated) throw new HttpException(404, "User not found");
    return { hintBalance: updated.hintBalance ?? 0 };
  }

  async grantStreakFreezes(walletAddress: string, amount: number) {
    const lower = walletAddress.toLowerCase();
    await this.userService.ensureUser(lower);
    const updated = await this.users.findOneAndUpdate(
      { walletAddress: lower },
      { $inc: { streakFreezes: Math.max(0, Math.floor(amount)) } },
      { new: true }
    );
    if (!updated) throw new HttpException(404, "User not found");
    return { streakFreezes: updated.streakFreezes ?? 0 };
  }

  async setBalances(
    walletAddress: string,
    balances: { hintBalance?: number; streakFreezes?: number }
  ) {
    const lower = walletAddress.toLowerCase();
    const set: Record<string, number> = {};
    if (balances.hintBalance !== undefined) set.hintBalance = Math.max(0, Math.floor(balances.hintBalance));
    if (balances.streakFreezes !== undefined) set.streakFreezes = Math.max(0, Math.floor(balances.streakFreezes));
    const updated = await this.users.findOneAndUpdate(
      { walletAddress: lower },
      { $set: set },
      { new: true, upsert: false }
    );
    if (!updated) throw new HttpException(404, "User not found");
    return {
      hintBalance: updated.hintBalance ?? 0,
      streakFreezes: updated.streakFreezes ?? 0,
    };
  }
}

export default HintsService;
