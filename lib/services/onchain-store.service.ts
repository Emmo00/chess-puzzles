import {
  createPublicClient,
  createWalletClient,
  http,
  Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { STORE_ABI, ReservationStatus } from "../config/onchainStore";
import { STORE_CONTRACT } from "../config/wagmi";

const RPC_URL = process.env.CELO_RPC_URL || undefined;
const PRIVATE_KEY = process.env.ONCHAIN_STORE_SIGNER_PRIVATE_KEY as `0x${string}`;

const account = PRIVATE_KEY ? privateKeyToAccount(PRIVATE_KEY) : null;

const publicClient = createPublicClient({
  chain: celo,
  transport: http(RPC_URL),
});

const walletClient = account
  ? createWalletClient({
      account,
      chain: celo,
      transport: http(RPC_URL),
    })
  : null;

export class OnchainStoreService {
  /**
   * Sets the daily puzzle on-chain.
   */
  public async setDailyPuzzle(
    utcDay: number,
    puzzleId: string,
    rewardAmountWei: string,
    maxCheckIns: number,
    nonce?: number
  ) {
    if (!walletClient || !account) {
      throw new Error("OnchainStoreService: No wallet client or account configured. Check ONCHAIN_STORE_SIGNER_PRIVATE_KEY.");
    }

    try {
      console.log(`Preparing setDailyPuzzle: day=${utcDay}, puzzle=${puzzleId}, reward=${rewardAmountWei}, max=${maxCheckIns}`);
      const { request } = await publicClient.simulateContract({
        account,
        address: STORE_CONTRACT as Address,
        abi: STORE_ABI,
        functionName: "setDailyPuzzle",
        args: [BigInt(utcDay), puzzleId, BigInt(rewardAmountWei), BigInt(maxCheckIns)],
        nonce,
      });

      const hash = await walletClient.writeContract(request);
      console.log(`setDailyPuzzle tx sent successfully. Hash: ${hash}`);
      return hash;
    } catch (error) {
      console.error("Error in setDailyPuzzle:", error);
      throw error;
    }
  }

  /**
   * Sets a user reservation status on-chain.
   */
  public async setReservation(
    utcDay: number,
    user: string,
    status: ReservationStatus,
    rewardAmountWei: string,
    solvedAt: number = 0,
    nonce?: number
  ) {
    if (!walletClient || !account) {
      throw new Error("OnchainStoreService: No wallet client or account configured. Check ONCHAIN_STORE_SIGNER_PRIVATE_KEY.");
    }

    try {
      console.log(`Preparing setReservation: day=${utcDay}, user=${user}, status=${status}, solvedAt=${solvedAt}`);
      const { request } = await publicClient.simulateContract({
        account,
        address: STORE_CONTRACT as Address,
        abi: STORE_ABI,
        functionName: "setReservation",
        args: [
          BigInt(utcDay),
          user as Address,
          status,
          BigInt(rewardAmountWei),
          BigInt(solvedAt),
        ],
        nonce,
      });

      const hash = await walletClient.writeContract(request);
      console.log(`setReservation tx sent successfully. Hash: ${hash}`);
      return hash;
    } catch (error) {
      console.error("Error in setReservation:", error);
      throw error;
    }
  }

  /**
   * Records a puzzle attempt on-chain.
   */
  public async recordPuzzleAttempt(
    user: string,
    puzzleId: string,
    completed: boolean,
    attempts: number,
    points: number,
    solvedAt: number = 0,
    nonce?: number
  ) {
    if (!walletClient || !account) {
      throw new Error("OnchainStoreService: No wallet client or account configured. Check ONCHAIN_STORE_SIGNER_PRIVATE_KEY.");
    }

    try {
      console.log(`Preparing recordPuzzleAttempt: user=${user}, puzzle=${puzzleId}, completed=${completed}, points=${points}`);
      const { request } = await publicClient.simulateContract({
        account,
        address: STORE_CONTRACT as Address,
        abi: STORE_ABI,
        functionName: "recordPuzzleAttempt",
        args: [
          user as Address,
          puzzleId,
          completed,
          BigInt(attempts),
          BigInt(points),
          BigInt(solvedAt),
        ],
        nonce,
      });

      const hash = await walletClient.writeContract(request);
      console.log(`recordPuzzleAttempt tx sent successfully. Hash: ${hash}`);
      return hash;
    } catch (error) {
      console.error("Error in recordPuzzleAttempt:", error);
      throw error;
    }
  }

  /**
   * Waits for a transaction receipt.
   */
  public async waitForReceipt(hash: `0x${string}`) {
    console.log(`Waiting for receipt for tx: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Receipt received for tx: ${hash}. Status: ${receipt.status}`);
    return receipt;
  }

  public async getTransactionCount() {
    const PRIVATE_KEY = process.env.ONCHAIN_STORE_SIGNER_PRIVATE_KEY as `0x${string}`;
    if (!PRIVATE_KEY) return 0;
    const account = privateKeyToAccount(PRIVATE_KEY);
    return await publicClient.getTransactionCount({
      address: account.address,
    });
  }

  /**
   * Helper to convert string status to ReservationStatus enum
   */
  public mapStatusToEnum(status: string): ReservationStatus {
    switch (status.toLowerCase()) {
      case "pending":
        return ReservationStatus.Pending;
      case "earned":
        return ReservationStatus.Earned;
      case "claiming":
        return ReservationStatus.Claiming;
      case "claimed":
        return ReservationStatus.Claimed;
      case "expired":
        return ReservationStatus.Expired;
      case "failed":
        return ReservationStatus.Failed;
      default:
        return ReservationStatus.None;
    }
  }
}

export default new OnchainStoreService();
