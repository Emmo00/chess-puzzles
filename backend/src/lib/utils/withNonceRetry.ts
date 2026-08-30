/**
 * Retries a transaction-sending function specifically on
 * "replacement transaction underpriced" errors, which can still occur
 * transiently (e.g. RPC lag) even with a NonceQueue in place. Not intended
 * as a substitute for the queue — use both together.
 */
export async function withNonceRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 500
): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const msg = String(err?.details ?? err?.shortMessage ?? err?.message ?? "");
    const isNonceError =
      msg.includes("replacement transaction underpriced") ||
      msg.includes("nonce too low") ||
      msg.includes("already known");

    if (retries > 0 && isNonceError) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return withNonceRetry(fn, retries - 1, delayMs * 2);
    }
    throw err;
  }
}
