import { createWalletClient, http, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { GAME_ASSETS_CONTRACT } from "../config/wagmi";
import { GAME_ASSETS_ABI } from "../abi/gameAssets";
import { publicClient } from "../../config/publicClient";
import { NonceQueue } from "../utils/nonceQueue";
import { withNonceRetry } from "../utils/withNonceRetry";
import { HttpException } from "./users.service";
import { attachDevPayload } from "../utils/devResponse";
import { logger, maskAddress } from "../logger";

// Module-level singletons: ALL writes from each wallet must go through
// its respective queue so that transactions are serialized per-signer.
// This prevents nonce races when the same wallet sends multiple txs
// back-to-back (e.g. ensureUser granting HINT then STREAK_FREEZE).
const adminQueue = new NonceQueue();
const consumerQueue = new NonceQueue();

class HintsService {
  private getConsumerClient() {
    const consumerPk = process.env.ASSET_CONSUMPTION_KEY;
    if (!consumerPk) {
      logger.error("hints.consumerKeyMissing");
      throw new HttpException(500, "Server consumer key not configured");
    }
    const account = privateKeyToAccount(consumerPk as `0x${string}`);
    return createWalletClient({ account, chain: celo, transport: http() });
  }

  private getAdminClient() {
    const adminPk = process.env.ASSET_GRANTING_KEY;
    if (!adminPk) {
      logger.error("hints.adminKeyMissing");
      throw new HttpException(500, "Server admin key not configured");
    }
    const account = privateKeyToAccount(adminPk as `0x${string}`);
    return createWalletClient({ account, chain: celo, transport: http() });
  }

  async consumeHint(walletAddress: string) {
    if (!GAME_ASSETS_CONTRACT) {
      logger.error("hints.contractNotConfigured", undefined, { wallet: maskAddress(walletAddress) });
      throw new HttpException(500, "GameAssets contract not configured");
    }
    const startedAt = Date.now();
    logger.debug("hints.consume.start", {
      wallet: maskAddress(walletAddress),
      contract: GAME_ASSETS_CONTRACT,
    });
    try {
      const result = await consumerQueue.run(() =>
        withNonceRetry(async () => {
          const walletClient = this.getConsumerClient();
          const hash = (await walletClient.writeContract({
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: "consumeHint",
            args: [walletAddress as `0x${string}`],
          })) as Hash;
          // Wait for inclusion before releasing the queue — this guarantees
          // the next queued send sees an advanced nonce.
          await publicClient.waitForTransactionReceipt({ hash });
          return { success: true, txHash: hash };
        })
      );
      logger.info("hints.consume.success", {
        wallet: maskAddress(walletAddress),
        txHash: result.txHash,
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      attachDevPayload(error, { method: "consumeHint", walletAddress, contract: GAME_ASSETS_CONTRACT });
      logger.error("hints.consume.failed", err, {
        wallet: maskAddress(walletAddress),
        contract: GAME_ASSETS_CONTRACT,
        durationMs: Date.now() - startedAt,
      });
      throw error;
    }
  }

  async consumeStreakFreeze(walletAddress: string) {
    if (!GAME_ASSETS_CONTRACT) {
      logger.error("hints.freeze.contractNotConfigured", undefined, { wallet: maskAddress(walletAddress) });
      throw new HttpException(500, "GameAssets contract not configured");
    }
    const startedAt = Date.now();
    logger.debug("hints.freeze.consume.start", { wallet: maskAddress(walletAddress) });
    try {
      const result = await consumerQueue.run(() =>
        withNonceRetry(async () => {
          const walletClient = this.getConsumerClient();
          const hash = (await walletClient.writeContract({
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: "consumeStreakFreeze",
            args: [walletAddress as `0x${string}`],
          })) as Hash;
          await publicClient.waitForTransactionReceipt({ hash });
          return { success: true, txHash: hash };
        })
      );
      logger.info("hints.freeze.consume.success", {
        wallet: maskAddress(walletAddress),
        txHash: result.txHash,
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      attachDevPayload(error, { method: "consumeStreakFreeze", walletAddress, contract: GAME_ASSETS_CONTRACT });
      logger.error("hints.freeze.consume.failed", err, {
        wallet: maskAddress(walletAddress),
        contract: GAME_ASSETS_CONTRACT,
        durationMs: Date.now() - startedAt,
      });
      throw error;
    }
  }

  async grantAsset(walletAddress: string, assetType: `0x${string}`, quantity: number) {
    if (!GAME_ASSETS_CONTRACT) {
      logger.error("hints.grant.contractNotConfigured", undefined, { wallet: maskAddress(walletAddress) });
      throw new HttpException(500, "GameAssets contract not configured");
    }
    const startedAt = Date.now();
    logger.debug("hints.grant.start", { wallet: maskAddress(walletAddress), assetType, quantity });
    try {
      const result = await adminQueue.run(() =>
        withNonceRetry(async () => {
          const walletClient = this.getAdminClient();
          const hash = (await walletClient.writeContract({
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: "grantAsset",
            args: [walletAddress as `0x${string}`, assetType, BigInt(quantity)],
          })) as Hash;
          // Wait for inclusion before releasing the queue — critical for
          // ensureUser which calls grantAsset twice back-to-back.
          await publicClient.waitForTransactionReceipt({ hash });
          return { success: true, txHash: hash };
        })
      );
      logger.info("hints.grant.success", {
        wallet: maskAddress(walletAddress),
        txHash: result.txHash,
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      attachDevPayload(error, { method: "grantAsset", walletAddress, assetType, quantity, contract: GAME_ASSETS_CONTRACT });
      logger.error("hints.grant.failed", err, {
        wallet: maskAddress(walletAddress),
        contract: GAME_ASSETS_CONTRACT,
        durationMs: Date.now() - startedAt,
      });
      throw error;
    }
  }
}

export default HintsService;
