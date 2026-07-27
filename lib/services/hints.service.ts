import userModel from "../models/users.model";
import { HttpException } from "./users.service";
import { getAccessConfig } from "../config/access";
import { generateDisplayName } from "../utils/nameGenerator";

class HintsService {
  public users = userModel;

  async ensureDefaults(walletAddress: string) {
    const { defaultHints, defaultStreakFreezes } = await getAccessConfig();
    const lower = walletAddress.toLowerCase();
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
  }

  async getBalance(walletAddress: string) {
    const lower = walletAddress.toLowerCase();
    await this.ensureDefaults(lower);
    const user = await this.users
      .findOne({ walletAddress: lower })
      .select("hintBalance streakFreezes")
      .lean();
    return {
      hintBalance: user?.hintBalance ?? 0,
      streakFreezes: user?.streakFreezes ?? 0,
    };
  }

  async consumeHint(walletAddress: string): Promise<{ hintBalance: number }> {
    const lower = walletAddress.toLowerCase();
    await this.ensureDefaults(lower);
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
    await this.ensureDefaults(lower);
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
    await this.ensureDefaults(lower);
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
