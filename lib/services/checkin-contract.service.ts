import { createPublicClient, formatUnits, http } from "viem";
import { celo } from "viem/chains";

import { PAYOUT_CLAIM_CONTRACT } from "@/lib/config/wagmi";
import {
  ERC20_METADATA_ABI,
  PAYOUT_CLAIMS_ABI,
} from "@/lib/config/payoutClaims";

interface CheckInContractValues {
  checkInAmountWei: string;
  checkInAmountDisplay: string;
  maxDailyCheckIns: number;
  payoutTokenAddress: `0x${string}`;
  payoutTokenDecimals: number;
  payoutTokenSymbol: string;
}

const CACHE_TTL_MS = 60 * 1000;

const publicClient = createPublicClient({
  chain: celo,
  transport: http(process.env.CELO_RPC_URL || undefined),
});

let cachedValues: CheckInContractValues | null = null;
let cacheAt = 0;

export class CheckInContractService {
  public async getCheckInContractValues(
    forceRefresh = false
  ): Promise<CheckInContractValues> {
    const now = Date.now();

    if (!forceRefresh && cachedValues && now - cacheAt < CACHE_TTL_MS) {
      return cachedValues;
    }

    const [payoutTokenAddress, checkInAmount, maxDailyCheckIns] = await Promise.all([
      publicClient.readContract({
        address: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
        abi: PAYOUT_CLAIMS_ABI,
        functionName: "payoutToken",
      }),
      publicClient.readContract({
        address: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
        abi: PAYOUT_CLAIMS_ABI,
        functionName: "checkInAmount",
      }),
      publicClient.readContract({
        address: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
        abi: PAYOUT_CLAIMS_ABI,
        functionName: "maxDailyCheckIns",
      }),
    ]);

    const [rawDecimals, rawSymbol] = await Promise.all([
      publicClient
        .readContract({
          address: payoutTokenAddress,
          abi: ERC20_METADATA_ABI,
          functionName: "decimals",
        })
        .catch(() => 18),
      publicClient
        .readContract({
          address: payoutTokenAddress,
          abi: ERC20_METADATA_ABI,
          functionName: "symbol",
        })
        .catch(() => "TOKEN"),
    ]);

    const payoutTokenDecimals = Number(rawDecimals);
    const payoutTokenSymbol = String(rawSymbol);

    const values: CheckInContractValues = {
      checkInAmountWei: checkInAmount.toString(),
      checkInAmountDisplay: formatUnits(checkInAmount, payoutTokenDecimals),
      maxDailyCheckIns: Number(maxDailyCheckIns),
      payoutTokenAddress,
      payoutTokenDecimals,
      payoutTokenSymbol,
    };

    cachedValues = values;
    cacheAt = now;

    return values;
  }

  public getPublicClient() {
    return publicClient;
  }
}

export default CheckInContractService;
