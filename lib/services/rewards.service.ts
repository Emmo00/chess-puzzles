import HintsService from "./hints.service";
import { levelForPoints } from "../leveling";

export interface MilestoneReward {
  hints: number;
  streakFreezes: number;
}

export interface LevelUpResult {
  oldLevel: number;
  newLevel: number;
  milestonesHit: number[];
  rewards: MilestoneReward[];
}

export function randomItem(seed: number): { hints: number; streakFreezes: number } {
  const r = Math.abs(seed % 100);
  if (r < 35) return { hints: 3, streakFreezes: 1 };
  if (r < 65) return { hints: 2, streakFreezes: 2 };
  if (r < 85) return { hints: 4, streakFreezes: 0 };
  return { hints: 1, streakFreezes: 3 };
}

export function computeMilestonesBetween(oldLevel: number, newLevel: number): number[] {
  const milestones: number[] = [];
  for (let l = oldLevel + 1; l <= newLevel; l += 1) {
    if (l % 5 === 0) milestones.push(l);
  }
  return milestones;
}

class RewardsService {
  private hints = new HintsService();

  async processLevelUp(
    walletAddress: string,
    oldPoints: number,
    newPoints: number
  ): Promise<LevelUpResult | null> {
    const oldLevel = levelForPoints(oldPoints);
    const newLevel = levelForPoints(newPoints);
    if (newLevel <= oldLevel) return null;

    const milestonesHit = computeMilestonesBetween(oldLevel, newLevel);
    if (milestonesHit.length === 0) {
      return { oldLevel, newLevel, milestonesHit: [], rewards: [] };
    }

    const rewards: MilestoneReward[] = [];
    for (const ms of milestonesHit) {
      const seed = ms * 7 + newPoints;
      const reward = randomItem(seed);
      await this.hints.grantHints(walletAddress, reward.hints);
      await this.hints.grantStreakFreezes(walletAddress, reward.streakFreezes);
      rewards.push({ hints: reward.hints, streakFreezes: reward.streakFreezes });
    }

    return { oldLevel, newLevel, milestonesHit, rewards };
  }
}

export default RewardsService;
