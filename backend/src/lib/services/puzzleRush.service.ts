import { randomInt } from "crypto";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";

import {
  PUZZLE_RUSH_MODES,
  type PuzzleRushConfig,
  type PuzzleRushMode,
  getPuzzleRushConfig,
  savePuzzleRushConfig as persistPuzzleRushConfig,
} from "../config/puzzleRush";
import { GAME_ASSETS_CONTRACT } from "../config/wagmi";
import { GAME_ASSETS_ABI } from "../abi/gameAssets";
import { getUtcDayNumber, getUtcDayRange } from "../utils/time";
import { User as userModel, PuzzleRushSession as puzzleRushSessionModel } from "@workspace/db";
import type { PuzzleRushSessionDoc } from "@workspace/db";
import type { Types } from "mongoose";
import PuzzleAPIClient from "./puzzle-api.client";
import UserService, { HttpException } from "./users.service";
import { calculatePuzzleRushPuzzleScore } from "../puzzle-rush/scoring";
import { Puzzle, IssuedPuzzle as issuedPuzzleModel } from "@workspace/db";

const celoClient = createPublicClient({ chain: celo, transport: http() });

export class RushAccessDeniedError extends HttpException {
  code: string;

  constructor(message: string) {
    super(403, message);
    this.name = "RushAccessDeniedError";
    this.code = "FREE_SESSION_USED";
  }
}

export interface PuzzleRushEntitlement {
  canPlay: boolean;
  walletConnected: boolean;
  hasDailyPass: boolean;
  freeSessionsPerDay: number;
  sessionsUsedToday: number;
  freeUsed: boolean;
  user?: {
    bestScore: number;
    lastRank: number | null;
    currentRank: number | null;
  } | null;
}

export interface PuzzleRushStatus {
  entitlement: PuzzleRushEntitlement;
  config: PuzzleRushConfig;
}

export interface PuzzleRushSessionRow
  extends PuzzleRushSessionDoc {
  _id: Types.ObjectId;
}

export interface PuzzleRushActivePayload {
  sessionId: string;
  mode: PuzzleRushMode;
  startTime: string;
  deadlineMs: number | null;
  state: {
    score: number;
    strikes: number;
    puzzlesSolved: number;
    streak: number;
    rating: number;
  };
  puzzle: Puzzle | null;
}

export interface PuzzleRushResultStats {
  score: number;
  puzzlesAttempted: number;
  puzzlesSolved: number;
  strikes: number;
  longestStreak: number;
  highestDifficultySolved: number;
  averageTimePerPuzzleSec: number;
  finalRank: number | null;
  rankDelta: number | null;
  durationSec: number;
}

export interface PuzzleRushCompletedPayload {
  sessionId: string;
  mode: PuzzleRushMode;
  completed: true;
  results: PuzzleRushResultStats;
}

export type PuzzleRushStepResponse =
  | {
      completed: false;
      state: PuzzleRushActivePayload["state"];
      stepIndex: number;
    }
  | PuzzleRushCompletedPayload;

export interface PuzzleRushLeaderboardEntry {
  rank: number;
  walletAddress: string;
  displayName: string;
  bestScore: number;
}

export interface PuzzleRushLeaderboardResponse {
  leaderboard: PuzzleRushLeaderboardEntry[];
  total: number;
  period: "all" | "today" | "week";
  limit: number;
  offset: number;
  hasMore: boolean;
  userRank: PuzzleRushLeaderboardEntry | null;
}

const clampSolveTime = (
  solveTimeSec: number,
  config: PuzzleRushConfig
): number => {
  if (!Number.isFinite(solveTimeSec)) return config.access.maxSolveTimeSec;
  return Math.max(
    config.access.minSolveTimeSec,
    Math.min(config.access.maxSolveTimeSec, Math.floor(solveTimeSec))
  );
};

class PuzzleRushService {
  public users = userModel;
  public model = puzzleRushSessionModel;

  public async hasActiveDailyPass(walletAddress: string): Promise<boolean> {
    if (!GAME_ASSETS_CONTRACT) return false;
    try {
      return Boolean(
        await celoClient.readContract({
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "hasActiveDailyPass",
          args: [walletAddress as `0x${string}`],
        })
      );
    } catch {
      return false;
    }
  }

  private async computeRank(walletAddress: string): Promise<number | null> {
    const user = await this.users
      .findOne({ walletAddress: walletAddress.toLowerCase() })
      .lean();
    const score = user?.puzzleRushBestScore ?? 0;
    if (score <= 0) return null;

    const higher = await this.users.countDocuments({
      puzzleRushBestScore: { $gt: score },
    });
    const equalEarlier = await this.users.countDocuments({
      puzzleRushBestScore: score,
      puzzleRushBestAt: { $lt: user.puzzleRushBestAt },
    });
    return higher + equalEarlier + 1;
  }

  public async getStatus(
    wallet?: string | null
  ): Promise<PuzzleRushStatus> {
    const config = await getPuzzleRushConfig();
    if (!wallet) {
      return {
        entitlement: {
          canPlay: false,
          walletConnected: false,
          hasDailyPass: false,
          freeSessionsPerDay: config.access.freeSessionsPerDay,
          sessionsUsedToday: 0,
          freeUsed: false,
          user: null,
        },
        config,
      };
    }

    const lower = wallet.toLowerCase();
    const [user, sessionsToday, hasDailyPass] = await Promise.all([
      this.users.findOne({ walletAddress: lower }).lean(),
      this.model.countDocuments({
        userWalletAddress: lower,
        startTime: { $gte: getUtcDayRange(getUtcDayNumber()).start },
      }),
      this.hasActiveDailyPass(lower),
    ]);

    const freeSessionsPerDay = config.access.freeSessionsPerDay;
    const canPlay = hasDailyPass || sessionsToday < freeSessionsPerDay;

    let currentRank: number | null = null;
    if (user && (user.puzzleRushBestScore ?? 0) > 0) {
      currentRank = await this.computeRank(lower);
    }

    return {
      entitlement: {
        canPlay,
        walletConnected: true,
        hasDailyPass,
        freeSessionsPerDay,
        sessionsUsedToday: sessionsToday,
        freeUsed: sessionsToday >= freeSessionsPerDay,
        user: {
          bestScore: user?.puzzleRushBestScore ?? 0,
          lastRank: user?.puzzleRushLastRank ?? null,
          currentRank,
        },
      },
      config,
    };
  }

  private toState(session: PuzzleRushSessionRow, rating: number) {
    return {
      score: session.score ?? 0,
      strikes: session.strikes ?? 0,
      puzzlesSolved: session.puzzlesSolved ?? 0,
      streak: session.currentStreak ?? 0,
      rating,
    };
  }

  public async startSession(
    walletAddress: string,
    mode: string
  ): Promise<PuzzleRushActivePayload> {
    const config = await getPuzzleRushConfig();
    if (!PUZZLE_RUSH_MODES.includes(mode as PuzzleRushMode)) {
      throw new HttpException(400, "Invalid Puzzle Rush mode");
    }
    const lower = walletAddress.toLowerCase();

    const hasDailyPass = await this.hasActiveDailyPass(lower);
    const sessionsToday = await this.model.countDocuments({
      userWalletAddress: lower,
      startTime: { $gte: getUtcDayRange(getUtcDayNumber()).start },
    });
    const freeLeft = config.access.freeSessionsPerDay - sessionsToday;
    if (!hasDailyPass && freeLeft <= 0) {
      throw new RushAccessDeniedError(
        "Free Puzzle Rush session used for today. Purchase a Daily Pass to keep playing."
      );
    }

    await new UserService().ensureUser(lower);
    await this.expireActiveSessions(lower);

    const now = new Date();
    const modeKey = mode as PuzzleRushMode;
    const session = await this.model.create({
      userWalletAddress: lower,
      mode: modeKey,
      startTime: now,
      status: "active",
      stepIndex: 0,
      pendingPuzzleId: null,
      pendingRating: null,
    });

    const durationSec =
      modeKey === "survival" ? 0 : config.access.modeDurationsSec[modeKey];
    const deadlineMs =
      durationSec > 0 ? now.getTime() + durationSec * 1000 : null;

    return {
      sessionId: session._id.toString(),
      mode: modeKey,
      startTime: now.toISOString(),
      deadlineMs,
      state: this.toState(session, 0),
      puzzle: null,
    };
  }

  private async expireActiveSessions(walletAddress: string) {
    const active = await this.model.find({
      userWalletAddress: walletAddress,
      status: "active",
    });
    for (const session of active) {
      await this.finalizeSession(session);
    }
  }

  private buildCompletedPayload(
    session: PuzzleRushSessionRow
  ): PuzzleRushCompletedPayload {
    const attempted = session.results?.length ?? 0;
    const avg = attempted > 0 ? (session.totalSolveTimeSec ?? 0) / attempted : 0;
    return {
      sessionId: session._id.toString(),
      mode: session.mode,
      completed: true,
      results: {
        score: session.score ?? 0,
        puzzlesAttempted: attempted,
        puzzlesSolved: session.puzzlesSolved ?? 0,
        strikes: session.strikes ?? 0,
        longestStreak: session.longestStreak ?? 0,
        highestDifficultySolved: session.highestDifficultySolved ?? 0,
        averageTimePerPuzzleSec: Math.round(avg * 10) / 10,
        finalRank: session.finalRank ?? null,
        rankDelta: session.rankDelta ?? null,
        durationSec: session.durationSec ?? 0,
      },
    };
  }

  private async finalizeSession(
    session: PuzzleRushSessionRow
  ): Promise<PuzzleRushSessionRow> {
    if (session.status === "completed") return session;

    const now = new Date();
    const durationSec = Math.max(
      0,
      Math.floor((now.getTime() - session.startTime.getTime()) / 1000)
    );
    const attempted = session.results?.length ?? 0;
    const avg =
      attempted > 0 ? (session.totalSolveTimeSec ?? 0) / attempted : 0;
    const highest = (session.results ?? [])
      .filter((r) => r.solved)
      .reduce((max, r) => Math.max(max, r.rating), 0);

    // Ensure the user exists, then advance/preserve the daily streak.
    // Puzzle Rush intentionally never touches totalPoints or the standard
    // puzzle leaderboard.
    const lower = session.userWalletAddress;
    const userService = new UserService();
    await userService.ensureUser(lower);
    try {
      await userService.updateUserStreakByUTCDay(lower, now);
    } catch {
      // Streak updates are best-effort; they never block results.
    }

    const current = await this.users.findOne({ walletAddress: lower }).lean();
    const previousLastRank = current?.puzzleRushLastRank ?? null;
    const previousBest = current?.puzzleRushBestScore ?? 0;

    let finalRank: number | null = null;
    let rankDelta: number | null = null;

    if (session.score > 0) {
      if (session.score > previousBest) {
        await this.users.updateOne(
          { walletAddress: lower },
          { $set: { puzzleRushBestScore: session.score, puzzleRushBestAt: now } }
        );
      }
      finalRank = await this.computeRank(lower);
      rankDelta =
        previousLastRank !== null && previousLastRank !== undefined && finalRank !== null
          ? previousLastRank - finalRank
          : null;
      await this.users.updateOne(
        { walletAddress: lower },
        { $set: { puzzleRushLastRank: finalRank } }
      );
    }

    const updated = await this.model.findByIdAndUpdate(
      session._id,
      {
        $set: {
          status: "completed",
          endTime: now,
          durationSec,
          highestDifficultySolved:
            Math.max(highest, session.highestDifficultySolved ?? 0),
          finalRank,
          rankDelta,
        },
      },
      { new: true }
    );
    return (updated ?? session) as PuzzleRushSessionRow;
  }

  public async reportResult(
    walletAddress: string,
    sessionId: string,
    payload: {
      stepIndex: number;
      puzzleId: string;
      solved: boolean;
      solveTimeSec: number;
    }
  ): Promise<PuzzleRushStepResponse> {
    const config = await getPuzzleRushConfig();
    const lower = walletAddress.toLowerCase();

    const session = await this.model
      .findOne({ _id: sessionId, userWalletAddress: lower })
      .lean();
    if (!session || session.status !== "active") {
      throw new HttpException(404, "Active Puzzle Rush session not found");
    }

    const now = Date.now();
    const durationSec =
      config.access.modeDurationsSec[session.mode as PuzzleRushMode] ?? 0;
    const deadlineMs = durationSec > 0 ? session.startTime.getTime() + durationSec * 1000 : null;

    // Hard stop: timed modes end at the deadline; survival caps at a max
    // duration to guard against abandoned sessions.
    const activeTimeSec = (now - session.startTime.getTime()) / 1000;
    const expired =
      deadlineMs !== null
        ? now > deadlineMs
        : activeTimeSec > config.access.survivalCapSec;

    if (expired) {
      const finalized = await this.finalizeSession(session);
      return this.buildCompletedPayload(finalized);
    }

    // Authorize the submitted puzzle against an issued (server-owned) record.
    // The authoritative rating lives here, so the client can never influence
    // the rating used for scoring.
    const issued = await issuedPuzzleModel
      .findOne({ sessionId: session._id.toString(), puzzleId: payload.puzzleId })
      .lean();
    if (!issued) {
      throw new HttpException(403, "Unauthorized puzzle");
    }

    const solveTimeSec = clampSolveTime(payload.solveTimeSec, config);
    const rating = issued.rating as number;
    const solved = Boolean(payload.solved);

    // Idempotent recovery: if this puzzle was already scored (a retry or a
    // stale duplicate), return the current authoritative state without
    // scoring it again. The client reconciles its local index from stepIndex.
    if (issued.used) {
      const sessionState = await this.model.findById(session._id).lean();
      if (!sessionState) {
        throw new HttpException(404, "Active Puzzle Rush session not found");
      }
      return {
        completed: false,
        state: this.toState(sessionState as PuzzleRushSessionRow, rating),
        stepIndex: sessionState.stepIndex ?? 0,
      };
    }

    const expectedStep = session.stepIndex ?? 0;
    if (payload.stepIndex !== expectedStep) {
      // Out-of-sync submission. Never silently drop a result; use an atomic
      // claim below so concurrent/stale submissions reconcile deterministically.
      if (payload.stepIndex < expectedStep) {
        return {
          completed: false,
          state: this.toState(session, rating),
          stepIndex: expectedStep,
        };
      }
      throw new HttpException(409, "Out of order result");
    }

    let sums = {
      score: session.score ?? 0,
      strikes: session.strikes ?? 0,
      currentStreak: session.currentStreak ?? 0,
      longestStreak: session.longestStreak ?? 0,
      puzzlesSolved: session.puzzlesSolved ?? 0,
    };

    if (solved) {
      sums.currentStreak += 1;
      sums.score += calculatePuzzleRushPuzzleScore({
        rating,
        solveTimeSec,
        streakCount: sums.currentStreak,
        config,
      });
      sums.longestStreak = Math.max(sums.longestStreak, sums.currentStreak);
      sums.puzzlesSolved += 1;
    } else {
      sums.strikes += 1;
      sums.currentStreak = 0;
    }

    const strikesToEnd = config.access.strikesToEnd;
    const endingNow = sums.strikes >= strikesToEnd;

    // Atomically claim this step so concurrent submissions cannot double-score.
    const claimed = await this.model.findOneAndUpdate(
      {
        _id: session._id,
        status: "active",
        stepIndex: expectedStep,
      },
      {
        $push: {
          results: {
            stepIndex: expectedStep,
            puzzleId: payload.puzzleId,
            rating,
            solved,
            solveTimeSec,
          },
        },
        $set: {
          score: sums.score,
          strikes: sums.strikes,
          currentStreak: sums.currentStreak,
          longestStreak: sums.longestStreak,
          puzzlesSolved: sums.puzzlesSolved,
          totalSolveTimeSec: (session.totalSolveTimeSec ?? 0) + solveTimeSec,
          stepIndex: expectedStep + 1,
        },
      },
      { new: true }
    );

    // Claim failed: another request (or a completed session) advanced the step.
    // Re-read and reconcile deterministically rather than silently diverging.
    if (!claimed) {
      const fresh = await this.model.findById(session._id).lean();
      if (!fresh) {
        throw new HttpException(404, "Active Puzzle Rush session not found");
      }
      if (fresh.status !== "active") {
        return this.buildCompletedPayload(fresh as PuzzleRushSessionRow);
      }
      return {
        completed: false,
        state: this.toState(fresh as PuzzleRushSessionRow, rating),
        stepIndex: fresh.stepIndex ?? 0,
      };
    }

    await issuedPuzzleModel.updateOne(
      { _id: issued._id },
      { $set: { used: true, playedAt: new Date() } }
    );

    if (endingNow) {
      const finalized = await this.finalizeSession(
        claimed as PuzzleRushSessionRow
      );
      return this.buildCompletedPayload(finalized);
    }

    return {
      completed: false,
      state: this.toState(claimed as PuzzleRushSessionRow, rating),
      stepIndex: claimed.stepIndex ?? 0,
    };
  }

  public async endSession(
    walletAddress: string,
    sessionId: string
  ): Promise<PuzzleRushCompletedPayload> {
    const session = await this.model
      .findOne({ _id: sessionId, userWalletAddress: walletAddress.toLowerCase() })
      .lean();
    if (!session || session.status !== "active") {
      throw new HttpException(404, "Active Puzzle Rush session not found");
    }
    await this.finalizeSession(session);
    const finalized = await this.model.findById(session._id).lean();
    if (!finalized) {
      throw new HttpException(404, "Active Puzzle Rush session not found");
    }
    return this.buildCompletedPayload(finalized);
  }

  public async getLeaderboard(
    period: "all" | "today" | "week",
    limit: number = 50,
    offset: number = 0,
    walletAddress?: string
  ): Promise<PuzzleRushLeaderboardResponse> {
    const now = new Date();
    let bestAtGte: Date | null = null;
    if (period === "today") {
      bestAtGte = getUtcDayRange(getUtcDayNumber(now)).start;
    } else if (period === "week") {
      bestAtGte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const filter: Record<string, unknown> = { puzzleRushBestScore: { $gt: 0 } };
    if (bestAtGte) filter.puzzleRushBestAt = { $gte: bestAtGte };

    const rows = await this.users
      .find(filter)
      .sort({ puzzleRushBestScore: -1, puzzleRushBestAt: 1 })
      .skip(offset)
      .limit(limit)
      .select("walletAddress displayName puzzleRushBestScore")
      .lean();

    const leaderboard: PuzzleRushLeaderboardEntry[] = rows.map((row, index) => ({
      rank: offset + index + 1,
      walletAddress: row.walletAddress,
      displayName:
        row.displayName || row.walletAddress?.slice(0, 8) || "Anonymous",
      bestScore: row.puzzleRushBestScore ?? 0,
    }));

    const total = await this.users.countDocuments(filter);
    const hasMore = offset + leaderboard.length < total;

    let userRank: PuzzleRushLeaderboardEntry | null = null;
    if (walletAddress) {
      const lower = walletAddress.toLowerCase();
      const me = await this.users.findOne({ walletAddress: lower }).lean();
      if (me && (me.puzzleRushBestScore ?? 0) > 0) {
        const rank = await this.computeRank(lower);
        if (rank !== null) {
          userRank = {
            rank,
            walletAddress: me.walletAddress,
            displayName:
              me.displayName || me.walletAddress?.slice(0, 8) || "Anonymous",
            bestScore: me.puzzleRushBestScore ?? 0,
          };
        }
      }
    }

    return { leaderboard, total, period, limit, offset, hasMore, userRank };
  }

  public async savePuzzleRushConfig(
    config: PuzzleRushConfig
  ): Promise<PuzzleRushConfig> {
    return persistPuzzleRushConfig(config);
  }
}

export default PuzzleRushService;