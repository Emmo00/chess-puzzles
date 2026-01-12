import { UserPuzzle, Puzzle, UserSettings } from "../types";
import { HttpException } from "./users.service";
import userPuzzlesModel from "../models/userPuzzles.model";
import { randomInt } from "crypto";
import PuzzleAPIClient from "./puzzle-api.client";
import { DEFAULT_THEMES } from "../config/puzzleThemes";

class PuzzleService {
  public userPuzzles = userPuzzlesModel;
  private puzzleAPI: PuzzleAPIClient;

  constructor() {
    this.puzzleAPI = new PuzzleAPIClient();
  }

  public async fetchNewSolvePuzzle(settings?: UserSettings) {
    // return their last puzzle if they have not solved it yet
    let uncompletedPuzzle = await userPuzzlesModel.findOne({ completed: false });

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

    // fetch a new puzzle with user settings
    const numberOfMoves = randomInt(2, 4);
    const puzzle = await this.puzzleAPI.fetchRandomPuzzle(
      numberOfMoves,
      settings?.ratingRange,
      enabledThemes
    );
    console.log("Fetched puzzle:", puzzle);
    return puzzle;
  }

  public async createUserPuzzle(userPuzzleData: Partial<UserPuzzle>): Promise<UserPuzzle> {
    const newUserPuzzle = await this.userPuzzles.create(userPuzzleData);
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
