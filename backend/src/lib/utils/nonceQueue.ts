/**
 * Serializes all writes from a single signer so that no two transactions
 * are ever "in flight" (broadcast but unconfirmed) at the same time.
 *
 * Root cause this fixes: sending two transactions back-to-back from the
 * same wallet can result in both being built with the same nonce if the
 * RPC hasn't yet reflected the first transaction as pending. The second
 * send then fails with "replacement transaction underpriced" because it
 * doesn't out-bid the first transaction's gas price.
 *
 * This queue guarantees each task only starts after the previous task's
 * transaction has been confirmed (see waitForTransactionReceipt usage in
 * HintsService), so the nonce has definitively advanced before the next
 * transaction is built.
 */
export class NonceQueue {
  private queue: Promise<unknown> = Promise.resolve();

  async run<T>(task: () => Promise<T>): Promise<T> {
    // Chain onto the existing queue regardless of whether the prior task
    // succeeded or failed, so one failure doesn't permanently wedge the
    // queue for all future callers.
    const result = this.queue.then(task, task);
    this.queue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }
}
