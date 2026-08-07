import { createWalletClient, http, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { GAME_ASSETS_CONTRACT } from "../config/wagmi";
import { GAME_ASSETS_ABI } from "../abi/gameAssets";
import { HttpException } from "./users.service";
import { attachDevPayload } from "../utils/devResponse";
import { logger, maskAddress } from "../logger";

class HintsService {
  private getConsumerClient() {
    const consumerPk = process.env.CONSUMER_PRIVATE_KEY;
    if (!consumerPk) {
      logger.error("hints.consumerKeyMissing");
      throw new HttpException(500, "Server consumer key not configured");
    }
    const account = privateKeyToAccount(consumerPk as `0x${string}`);
    return createWalletClient({ account, chain: celo, transport: http() });
  }

  private getAdminClient() {
    const adminPk = process.env.GAME_ASSETS_ADMIN_KEY;
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
    const walletClient = this.getConsumerClient();
    const startedAt = Date.now();
    logger.debug("hints.consume.start", {
      wallet: maskAddress(walletAddress),
      contract: GAME_ASSETS_CONTRACT,
    });
    try {
      const hash = (await walletClient.writeContract({
        address: GAME_ASSETS_CONTRACT,
        abi: GAME_ASSETS_ABI,
        functionName: "consumeHint",
        args: [walletAddress as `0x${string}`],
      })) as Hash;
      logger.info("hints.consume.success", {
        wallet: maskAddress(walletAddress),
        txHash: hash,
        durationMs: Date.now() - startedAt,
      });
      return { success: true, txHash: hash };
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
    const walletClient = this.getConsumerClient();
    const startedAt = Date.now();
    logger.debug("hints.freeze.consume.start", { wallet: maskAddress(walletAddress) });
    try {
      const hash = (await walletClient.writeContract({
        address: GAME_ASSETS_CONTRACT,
        abi: GAME_ASSETS_ABI,
        functionName: "consumeStreakFreeze",
        args: [walletAddress as `0x${string}`],
      })) as Hash;
      logger.info("hints.freeze.consume.success", {
        wallet: maskAddress(walletAddress),
        txHash: hash,
        durationMs: Date.now() - startedAt,
      });
      return { success: true, txHash: hash };
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
    const walletClient = this.getAdminClient();
    const startedAt = Date.now();
    logger.debug("hints.grant.start", { wallet: maskAddress(walletAddress), assetType, quantity });
    try {
      const hash = (await walletClient.writeContract({
        address: GAME_ASSETS_CONTRACT,
        abi: GAME_ASSETS_ABI,
        functionName: "grantAsset",
        args: [walletAddress as `0x${string}`, assetType, BigInt(quantity)],
      })) as Hash;
      logger.info("hints.grant.success", {
        wallet: maskAddress(walletAddress),
        txHash: hash,
        durationMs: Date.now() - startedAt,
      });
      return { success: true, txHash: hash };
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