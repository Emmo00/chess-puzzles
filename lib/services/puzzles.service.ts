import { UserPuzzle, Puzzle, UserSettings } from "../types";
import { HttpException } from "./users.service";
import userPuzzlesModel from "../models/userPuzzles.model";
import { randomInt } from "crypto";
import PuzzleAPIClient from "./puzzle-api.client";
import { DEFAULT_THEMES } from "../config/puzzleThemes";
import onchainStore from "./onchain-store.service";

type FetchPuzzleOptions = {
  userWalletAddress?: string;
  puzzleType?: "solve" | "daily";
  reuseIncomplete?: boolean;
};

class PuzzleService {
  public userPuzzles = userPuzzlesModel;
  private puzzleAPI: PuzzleAPIClient;

  constructor() {
    this.puzzleAPI = new PuzzleAPIClient();
  }

  public async fetchNewSolvePuzzle(
    settings?: UserSettings,
    options?: FetchPuzzleOptions
  ) {
    const puzzleType = options?.puzzleType || "solve";

    // Return previous unsolved puzzle only for this user and puzzle type when explicitly enabled.
    const shouldReuseIncomplete =
      options?.reuseIncomplete !== false && Boolean(options?.userWalletAddress);
    const uncompletedPuzzle = shouldReuseIncomplete
      ? await userPuzzlesModel
          .findOne({
            userWalletAddress: options?.userWalletAddress,
            type: puzzleType,
            completed: false,
          })
          .sort({ createdAt: -1 })
      : null;

    if (uncompletedPuzzle) {
      const puzzle = await this.puzzleAPI.fetchPuzzleById(uncompletedPuzzle.puzzleId);
      return {...puzzle, oldAttempt: true };
    }

    // Calculate enabled themes from disabled themes
    // Only pass themes to API if user has disabled some
    let enabledThemes: string[] | undefined = undefined;
    if (settings?.disabledThemes && settings.disabledThemes.length > 0) {
      enabledThemes = DEFAULT_THEMES.filter(id => !settings.disabledThemes.includes(id));
    }

    // Fetch a new puzzle with user settings. Use a candidate batch to avoid repeats.
    const numberOfMoves = randomInt(2, 5);
    const puzzleBatch = await this.puzzleAPI.fetchRandomPuzzles(
      numberOfMoves,
      settings?.ratingRange,
      enabledThemes,
      12
    );

    const recentPuzzleIds = options?.userWalletAddress
      ? new Set(
          (
            await userPuzzlesModel
              .find(
                {
                  userWalletAddress: options.userWalletAddress,
                  type: puzzleType,
                },
                { puzzleId: 1 }
              )
              .sort({ createdAt: -1 })
              .limit(50)
              .lean()
          ).map((entry) => entry.puzzleId)
        )
      : new Set<string>();

    const unseenCandidates = puzzleBatch.filter(
      (candidate) => !recentPuzzleIds.has(candidate.puzzleid)
    );

    const candidatePool = unseenCandidates.length > 0 ? unseenCandidates : puzzleBatch;
    const puzzle = candidatePool[randomInt(0, candidatePool.length)];

    console.log("Fetched puzzle:", puzzle);
    return puzzle;
  }

  public async createUserPuzzle(userPuzzleData: Partial<UserPuzzle>): Promise<UserPuzzle> {
    const newUserPuzzle = await this.userPuzzles.create(userPuzzleData);
    
    // Fire and forget on-chain record
    if (newUserPuzzle.userWalletAddress && newUserPuzzle.puzzleId) {
      onchainStore.recordPuzzleAttempt(
        newUserPuzzle.userWalletAddress,
        newUserPuzzle.puzzleId,
        newUserPuzzle.completed || false,
        newUserPuzzle.attempts || 0,
        newUserPuzzle.points || 0,
        newUserPuzzle.solvedAt ? Math.floor(newUserPuzzle.solvedAt.getTime() / 1000) : 0
      ).then(hash => {
        if (hash) {
          this.userPuzzles.findByIdAndUpdate(newUserPuzzle._id, { onChainSynced: true }).exec();
        }
      }).catch(err => console.error("On-chain recordPuzzleAttempt failed:", err));
    }

    return newUserPuzzle;
  }

  public async updateUserPuzzle({
    userWalletAddress,
    puzzleId,
    completed,
    attempts,
    type,
    points,
  }: Partial<UserPuzzle>) {
    const updatedUserPuzzle = await this.userPuzzles.findOneAndUpdate(
      { userWalletAddress, puzzleId },
      { completed, attempts, type, points, solvedAt: completed ? new Date() : undefined },
      { new: true }
    );

    // Fire and forget on-chain record
    if (updatedUserPuzzle && updatedUserPuzzle.userWalletAddress && updatedUserPuzzle.puzzleId) {
      onchainStore.recordPuzzleAttempt(
        updatedUserPuzzle.userWalletAddress,
        updatedUserPuzzle.puzzleId,
        updatedUserPuzzle.completed || false,
        updatedUserPuzzle.attempts || 0,
        updatedUserPuzzle.points || 0,
        updatedUserPuzzle.solvedAt ? Math.floor(updatedUserPuzzle.solvedAt.getTime() / 1000) : 0
      ).then(hash => {
        if (hash) {
          this.userPuzzles.findByIdAndUpdate(updatedUserPuzzle._id, { onChainSynced: true }).exec();
        }
      }).catch(err => console.error("On-chain recordPuzzleAttempt failed:", err));
    }

    return updatedUserPuzzle;
  }

  public async getNumberOfPuzzlesGivenToday(userWalletAddress: string, type = "solve") {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const count = await this.userPuzzles.countDocuments({
      userWalletAddress,
      type,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      completed: true,
    });

    return count;
  }
}

export default PuzzleService;
