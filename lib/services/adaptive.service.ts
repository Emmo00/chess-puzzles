import userModel from "../models/users.model";
import { HttpException } from "./users.service";

const DEFAULT_EFFECTIVE_RATING = 1000;
const MIN_RATING = 400;
const MAX_RATING = 3000;
const ADAPTIVE_BAND = 150;

export interface SolvePerformance {
  solveTimeSec: number;
  hints: number;
  mistakes: number;
  puzzleRating: number;
  failed?: boolean;
}

function clampRating(rating: number): number {
  return Math.max(MIN_RATING, Math.min(MAX_RATING, Math.round(rating)));
}

class AdaptiveService {
  public users = userModel;

  async getEffectiveRating(walletAddress: string): Promise<number> {
    const lower = walletAddress.toLowerCase();
    const user = await this.users.findOne({ walletAddress: lower }).select("effectiveRating").lean();
    const rating = user?.effectiveRating;
    if (rating === undefined || rating === null || Number.isNaN(rating)) {
      return DEFAULT_EFFECTIVE_RATING;
    }
    return clampRating(rating);
  }

  computeStep(perf: SolvePerformance): number {
    if (perf.failed || perf.hints >= 3) return -40;
    if (perf.mistakes >= 3) return -30;
    if (perf.hints === 0 && perf.solveTimeSec > 0 && perf.solveTimeSec <= 15) return 60;
    if (perf.hints <= 1 && perf.solveTimeSec <= 40) return 30;
    if (perf.hints <= 2 && perf.solveTimeSec <= 90) return 0;
    if (perf.solveTimeSec > 120) return -30;
    return -20;
  }

  async updateRatingAfterSolve(walletAddress: string, perf: SolvePerformance): Promise<number> {
    const lower = walletAddress.toLowerCase();
    const current = await this.getEffectiveRating(lower);
    const step = this.computeStep(perf);
    const blended = current * 0.8 + perf.puzzleRating * 0.2 + step;
    const next = clampRating(blended);

    await this.users.updateOne(
      { walletAddress: lower },
      { $set: { effectiveRating: next } }
    );

    return next;
  }

  getAdaptiveRatingRange(effectiveRating: number) {
    return {
      min: Math.max(MIN_RATING, effectiveRating - ADAPTIVE_BAND),
      max: Math.min(MAX_RATING, effectiveRating + ADAPTIVE_BAND),
    };
  }
}

export default AdaptiveService;
