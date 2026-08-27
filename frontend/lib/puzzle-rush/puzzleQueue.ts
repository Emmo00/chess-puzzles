import { Puzzle } from "@/lib/types";

export const FIRST_MOVE_COUNT = 3;
export const LOW_WATER = 4;
export const DEFAULT_BATCH = 12;
const MAX_QUEUE = 6;

export type FetchBatchFn = (moves: number, count?: number) => Promise<Puzzle[]>;

interface QueueSlot {
  items: Puzzle[];
  inflight: boolean;
}

/**
 * Client-side puzzle queue (module singleton) decoupled from gameplay order.
 * The server issues puzzles and persists the authoritative rating; the client
 * only controls availability. Batches are fetched in the background so the next
 * puzzle is always available synchronously.
 */
class PuzzleQueue {
  private queues: Record<number, QueueSlot> = {
    1: { items: [], inflight: false },
    2: { items: [], inflight: false },
    3: { items: [], inflight: false },
  };

  private sessionId: string | null = null;
  private fetchFn: FetchBatchFn | null = null;
  private servedCount = 0;
  private waiters: Array<() => void> = [];

  /** Configure for a new session, resetting session-local state. */
  public configure(sessionId: string, fetchFn: FetchBatchFn) {
    this.sessionId = sessionId;
    this.fetchFn = fetchFn;
    this.servedCount = 0;
    for (const key of [1, 2, 3]) {
      this.queues[key].items = [];
      this.queues[key].inflight = false;
    }
    this.notifyAll();
  }

  /** Synchronous pop of the next puzzle; returns null if the queue is empty. */
  public dequeue(): Puzzle | null {
    const moves = this.chooseMoveCount();
    const slot = this.queues[moves];
    const puzzle = slot.items.shift() ?? null;
    if (puzzle) this.servedCount += 1;
    if (this.sessionId) this.refillIfNeeded(moves);
    return puzzle;
  }

  /**
   * Await until a puzzle is available (used only on the rare empty-queue path).
   */
  public async waitForPuzzle(timeoutMs = 8000): Promise<Puzzle> {
    const immediate = this.dequeue();
    if (immediate) return immediate;

    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      this.waiters.push(done);
      setTimeout(done, timeoutMs);
    });

    const next = this.dequeue();
    if (next) return next;
    throw new Error("Puzzle queue timed out");
  }

  /** Preload queues so the first N puzzles are available synchronously. */
  public async preload(count: number = FIRST_MOVE_COUNT): Promise<void> {
    if (!this.sessionId || !this.fetchFn) return;
    // The server enforces the first N issued puzzles to be 1-move, so the
    // first `count` come from q1. Ensure q1 has at least `count`.
    const promises: Promise<void>[] = [];
    const needed = Math.max(0, count - this.queues[1].items.length);
    for (let i = 0; i < Math.ceil(needed / DEFAULT_BATCH); i++) {
      promises.push(this.fill(1));
    }
    // Start q2/q3 warm in the background.
    promises.push(this.fill(2));
    promises.push(this.fill(3));
    await Promise.all(promises);
  }

  private chooseMoveCount(): number {
    if (this.servedCount < FIRST_MOVE_COUNT) return 1;
    return 1 + Math.floor(Math.random() * 3);
  }

  private async fill(moves: number): Promise<void> {
    if (!this.sessionId || !this.fetchFn) return;
    const slot = this.queues[moves];
    if (slot.inflight) return;
    slot.inflight = true;
    try {
      const puzzles = await this.fetchFn(moves, DEFAULT_BATCH);
      const seen = new Set(slot.items.map((p) => p.puzzleid));
      for (const p of puzzles) {
        if (slot.items.length >= MAX_QUEUE) break;
        if (!seen.has(p.puzzleid)) {
          slot.items.push(p);
          seen.add(p.puzzleid);
        }
      }
      this.notifyAll();
    } catch {
      // leave inflight cleared below; the next dequeue refills if needed
    } finally {
      slot.inflight = false;
    }
  }

  private refillIfNeeded(moves: number) {
    const slot = this.queues[moves];
    if (slot.items.length <= LOW_WATER && !slot.inflight) {
      void this.fill(moves);
    }
  }

  private notifyAll() {
    const waiters = this.waiters;
    this.waiters = [];
    for (const w of waiters) w();
  }
}

const puzzleQueue = new PuzzleQueue();
export { puzzleQueue };
export default puzzleQueue;
