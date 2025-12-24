import { UserPuzzle, Puzzle } from "../types";
import { HttpException } from "./users.service";
import userPuzzlesModel from "../models/userPuzzles.model";
import { randomInt } from "crypto";
import PuzzleAPIClient from "./puzzle-api.client";

class PuzzleService {
  public userPuzzles = userPuzzlesModel;
  private puzzleAPI: PuzzleAPIClient;

  constructor() {
    this.puzzleAPI = new PuzzleAPIClient();
  }

  public async fetchNewSolvePuzzle() {
    // return their last puzzle if they have not solved it yet
    let uncompletedPuzzle = await userPuzzlesModel.findOne({ completed: false });

    if (uncompletedPuzzle) {
      const puzzle = await this.puzzleAPI.fetchPuzzleById(uncompletedPuzzle.puzzleId);
      return {...puzzle, oldAttempt: true };
    }

    // fetch a new puzzle
    const numberOfMoves = randomInt(2, 4);
    const puzzle = await this.puzzleAPI.fetchRandomPuzzle(numberOfMoves);
    console.log("Fetched puzzle:", puzzle);
    return puzzle;
  }

  public async createUserPuzzle(userPuzzleData: Partial<UserPuzzle>): Promise<UserPuzzle> {
    const newUserPuzzle = await this.userPuzzles.create(userPuzzleData);
    return newUserPuzzle;
  }

  public async updateUserPuzzle({
    userfid,
    puzzleId,
    completed,
    attempts,
    type,
    points,
  }: Partial<UserPuzzle>) {
    const updatedUserPuzzle = await this.userPuzzles.findOneAndUpdate(
      { userfid, puzzleId },
      { completed, attempts, type, points, solvedAt: completed ? new Date() : undefined },
      { new: true }
    );
    return updatedUserPuzzle;
  }

  public async getNumberOfPuzzlesGivenToday(userfid: string | number, type = "solve") {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const count = await this.userPuzzles.countDocuments({
      userfid,
      type,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      completed: true,
    });

    return count;
  }
}

export default PuzzleService;
