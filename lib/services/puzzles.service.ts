import { UserPuzzle, Puzzle } from "../types";
import { HttpException } from "./users.service";
import userPuzzlesModel from "../models/userPuzzles.model";
import { randomInt } from "crypto";

class PuzzleService {
  public userPuzzles = userPuzzlesModel;

  public async fetchPuzzle() {
    const { PUZZLE_API_URL, PUZZLE_API_KEY } = process.env;

    if (!PUZZLE_API_URL || !PUZZLE_API_KEY) {
      throw new HttpException(500, "Puzzle API not configured");
    }

    const numberOfMoves = randomInt(2, 4);

    const response = await fetch(
      `${PUZZLE_API_URL}/?themesType=ALL&playerMoves=${numberOfMoves}&count=1`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Host": PUZZLE_API_URL,
          "X-RapidAPI-Key": PUZZLE_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new HttpException(500, "Failed to fetch puzzle");
    }

    const puzzles: Puzzle[] = await response.json();
    const puzzle = puzzles[0];
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
    points,
  }: Partial<UserPuzzle>) {
    const updatedUserPuzzle = await this.userPuzzles.findOneAndUpdate(
      { userfid, puzzleId },
      { completed, attempts, points, solvedAt: completed ? new Date() : undefined },
      { new: true }
    );
    return updatedUserPuzzle;
  }

  public async getNumberOfPuzzlesGivenToday(userfid: string | number, type = "free") {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const count = await this.userPuzzles.countDocuments({
      userfid,
      type,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    return count;
  }
}

export default PuzzleService;