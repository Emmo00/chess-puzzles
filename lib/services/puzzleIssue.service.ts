import { randomInt } from "crypto";
import { Puzzle } from "../types";
import { HttpException } from "./users.service";
import PuzzleAPIClient from "./puzzle-api.client";
import puzzleRushSessionModel, {
  type PuzzleRushSessionDoc,
} from "../models/puzzleRushSession.model";
import issuedPuzzleModel from "../models/issuedPuzzle.model";
import type { Types } from "mongoose";

export const ISSUE_LOW_WATER = 4;
export const ISSUE_BATCH_SIZE = 12;
/** First N puzzles of every session must be 1-move puzzles (server-enforced). */
export const FIRST_MOVE_COUNT = 3;

export interface ActiveSession extends PuzzleRushSessionDoc {
  _id: Types.ObjectId;
}

/**
 * Decouples puzzle sourcing from gameplay ordering. The client requests
 * batches to keep local queues warm; the server issues puzzles and persists
 * the authoritative `puzzleId -> rating` mapping so that scoring never
 * depends on a client-supplied rating.
 */
class PuzzleIssueService {
  private api = new PuzzleAPIClient();

  private async usedPuzzleIds(session: ActiveSession): Promise<Set<string>> {
    const issued = await issuedPuzzleModel
      .find({ sessionId: session._id.toString() })
      .select("puzzleId")
      .lean();
    return new Set(issued.map((i) => i.puzzleId as string));
  }

  private async assertActiveSession(
    walletAddress: string,
    sessionId: string
  ): Promise<ActiveSession> {
    const lower = walletAddress.toLowerCase();
    const session = await puzzleRushSessionModel
      .findOne({ _id: sessionId, userWalletAddress: lower })
      .lean();
    if (!session || session.status !== "active") {
      throw new HttpException(404, "Active Puzzle Rush session not found");
    }
    return session as unknown as ActiveSession;
  }

  /**
   * Issue a batch of puzzles for an active session. Enforces the first-N
   * 1-move rule server-side (defense-in-depth alongside the client counter).
   * Returns full Puzzle objects (rating included for display only); the
   * authoritative rating is persisted and later resolved on the server.
   */
  public async issueBatch(
    walletAddress: string,
    sessionId: string,
    requestedMoves: number,
    count: number = ISSUE_BATCH_SIZE
  ): Promise<Puzzle[]> {
    const session = await this.assertActiveSession(walletAddress, sessionId);

    const moves = this.resolveMoves(session, requestedMoves);
    const capped = Math.min(Math.max(count, 1), ISSUE_BATCH_SIZE);
    const used = await this.usedPuzzleIds(session);

    let batch = await this.api.fetchRandomPuzzles(moves, undefined, undefined, capped);
    const unseen = batch.filter((p) => !used.has(p.puzzleid));
    if (unseen.length === 0) {
      batch = await this.api.fetchRandomPuzzles(moves, undefined, undefined, capped);
    } else {
      batch = unseen;
    }

    const puzzleId = session._id.toString();
    const userWalletAddress = walletAddress.toLowerCase();
    const docs = batch.map((p) => ({
      sessionId: puzzleId,
      userWalletAddress,
      puzzleId: p.puzzleid,
      playerMoves: moves,
      rating: p.rating,
    }));

    // Bulk insert, tolerating any unique conflicts from race conditions.
    try {
      await issuedPuzzleModel.insertMany(docs, { ordered: false });
    } catch {
      // ignore duplicate-key conflicts; the records we need already exist
    }

    return batch;
  }

  /** First N puzzles of a session are forced to 1-move regardless of request. */
  private resolveMoves(
    session: ActiveSession,
    requestedMoves: number
  ): number {
    const attempted = session.results?.length ?? 0;
    if (attempted < FIRST_MOVE_COUNT) return 1;
    const normalized = [1, 2, 3].includes(requestedMoves)
      ? requestedMoves
      : randomInt(2, 5);
    return [1, 2, 3].includes(normalized) ? normalized : 2;
  }
}

const puzzleIssueService = new PuzzleIssueService();
export { puzzleIssueService };
export default puzzleIssueService;
