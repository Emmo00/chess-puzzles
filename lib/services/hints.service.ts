import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { GAME_ASSETS_CONTRACT } from "../config/wagmi";
import { GAME_ASSETS_ABI } from "../abi/gameAssets";
import { HttpException } from "./users.service";
import { attachDevPayload } from "../utils/devResponse";

class HintsService {
  private getConsumerClient() {
    const consumerPk = process.env.CONSUMER_PRIVATE_KEY;
    if (!consumerPk) throw new HttpException(500, "Server consumer key not configured");
    const account = privateKeyToAccount(consumerPk as `0x${string}`);
    return createWalletClient({ account, chain: celo, transport: http() });
  }

  private getAdminClient() {
    const adminPk = process.env.GAME_ASSETS_ADMIN_KEY;
    if (!adminPk) throw new HttpException(500, "Server admin key not configured");
    const account = privateKeyToAccount(adminPk as `0x${string}`);
    return createWalletClient({ account, chain: celo, transport: http() });
  }

  async consumeHint(walletAddress: string) {
    if (!GAME_ASSETS_CONTRACT) throw new HttpException(500, "GameAssets contract not configured");
    const walletClient = this.getConsumerClient();
    try {
      const hash = await walletClient.writeContract({
        address: GAME_ASSETS_CONTRACT,
        abi: GAME_ASSETS_ABI,
        functionName: "consumeHint",
        args: [walletAddress as `0x${string}`],
      });
      return { success: true, txHash: hash };
    } catch (error) {
      attachDevPayload(error, { method: "consumeHint", walletAddress, contract: GAME_ASSETS_CONTRACT });
      throw error;
    }
  }

  async consumeStreakFreeze(walletAddress: string) {
    if (!GAME_ASSETS_CONTRACT) throw new HttpException(500, "GameAssets contract not configured");
    const walletClient = this.getConsumerClient();
    try {
      const hash = await walletClient.writeContract({
        address: GAME_ASSETS_CONTRACT,
        abi: GAME_ASSETS_ABI,
        functionName: "consumeStreakFreeze",
        args: [walletAddress as `0x${string}`],
      });
      return { success: true, txHash: hash };
    } catch (error) {
      attachDevPayload(error, { method: "consumeStreakFreeze", walletAddress, contract: GAME_ASSETS_CONTRACT });
      throw error;
    }
  }

  async grantAsset(walletAddress: string, assetType: `0x${string}`, quantity: number) {
    if (!GAME_ASSETS_CONTRACT) throw new HttpException(500, "GameAssets contract not configured");
    const walletClient = this.getAdminClient();
    try {
      const hash = await walletClient.writeContract({
        address: GAME_ASSETS_CONTRACT,
        abi: GAME_ASSETS_ABI,
        functionName: "grantAsset",
        args: [walletAddress as `0x${string}`, assetType, BigInt(quantity)],
      });
      return { success: true, txHash: hash };
    } catch (error) {
      attachDevPayload(error, { method: "grantAsset", walletAddress, assetType, quantity, contract: GAME_ASSETS_CONTRACT });
      throw error;
    }
  }
}

export default HintsService;