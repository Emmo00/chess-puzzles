import type {
  PuzzleRushActiveState,
  PuzzleRushCompletedPayload,
  PuzzleRushStepResponse,
} from "@/lib/hooks/usePuzzleRush";

export interface ResultItem {
  puzzleId: string;
  solved: boolean;
  solveTimeSec: number;
}

export type SubmitResultFn = (
  payload: {
    sessionId: string;
    stepIndex: number;
    puzzleId: string;
    solved: boolean;
    solveTimeSec: number;
  }
) => Promise<PuzzleRushStepResponse>;

const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 800;

function isTransient(err: any): boolean {
  const status = err?.status;
  if (!status) return true; // network error / no status
  return status >= 500 || status === 409 || status === 429;
}

/**
 * Serialized, retrying result submitter. Results are submitted strictly in
 * order (one in flight at a time, awaiting each response) so scoring order on
 * the server always matches gameplay order. It never silently drops a result:
 * successes advance the authoritative stepIndex; transient failures auto-retry;
 * and if the session is over (or recovery is exhausted) it deterministically
 * transitions to the results/end state.
 */
class ResultQueue {
  private submitFn: SubmitResultFn | null = null;
  private onState: ((state: PuzzleRushActiveState) => void) | null = null;
  private onCompleted: ((payload: PuzzleRushCompletedPayload) => void) | null =
    null;
  private onEnded: (() => void) | null = null;
  private sessionId: string | null = null;
  private stepIndex = 0;
  private queue: ResultItem[] = [];
  private running = false;
  private ended = false;

  public configure(opts: {
    submitFn: SubmitResultFn;
    onState: (state: PuzzleRushActiveState) => void;
    onCompleted: (payload: PuzzleRushCompletedPayload) => void;
    onEnded: () => void;
    sessionId: string;
    stepIndex: number;
  }) {
    this.submitFn = opts.submitFn;
    this.onState = opts.onState;
    this.onCompleted = opts.onCompleted;
    this.onEnded = opts.onEnded;
    this.sessionId = opts.sessionId;
    this.stepIndex = opts.stepIndex;
    this.queue = [];
    this.running = false;
    this.ended = false;
  }

  public enqueue(item: ResultItem) {
    this.queue.push(item);
    void this.drain();
  }

  public isEnded() {
    return this.ended;
  }

  private async drain() {
    if (this.running || this.ended) return;
    if (!this.submitFn || !this.sessionId) return;
    this.running = true;
    try {
      while (this.queue.length > 0 && !this.ended) {
        const item = this.queue.shift()!;
        const ok = await this.submitWithRetry(item);
        if (!ok) {
          // Persistent failure or session end; stop processing further results.
          this.ended = true;
          break;
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async submitWithRetry(item: ResultItem): Promise<boolean> {
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      try {
        const response = await this.submitFn!({
          sessionId: this.sessionId!,
          stepIndex: this.stepIndex,
          puzzleId: item.puzzleId,
          solved: item.solved,
          solveTimeSec: item.solveTimeSec,
        });

        if (response.completed) {
          this.ended = true;
          this.onCompleted?.(response);
          return false;
        }

        // Advance from the server-authoritative step index (keeps us in sync
        // and makes out-of-order submissions impossible under serial play).
        this.stepIndex = response.stepIndex;
        this.onState?.(response.state);
        return true;
      } catch (err: any) {
        const status = err?.status;
        // The session no longer exists / is no longer active server-side.
        // Deterministically reconcile by transitioning to the end state.
        if (status === 404 || status === 403) {
          this.ended = true;
          this.onEnded?.();
          return false;
        }
        if (!isTransient(err)) {
          // Non-transient, non-recoverable: transition to end to avoid
          // permanent divergence.
          this.ended = true;
          this.onEnded?.();
          return false;
        }
        attempt += 1;
        if (attempt >= MAX_RETRIES) {
          this.ended = true;
          this.onEnded?.();
          return false;
        }
        await wait(BASE_BACKOFF_MS * Math.pow(2, attempt - 1));
      }
    }
    this.ended = true;
    this.onEnded?.();
    return false;
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

const resultQueue = new ResultQueue();
export { resultQueue };
export default resultQueue;
