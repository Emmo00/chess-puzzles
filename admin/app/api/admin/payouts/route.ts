import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { createPublicClient, http, formatUnits } from "viem";
import { celo } from "viem/chains";
import { PAYOUT_CLAIM_CONTRACT } from "@workspace/contracts";
import { PAYOUT_CLAIMS_ABI, ERC20_METADATA_ABI } from "@workspace/contracts";
import { dbConnect } from "@workspace/db";
import { CheckInReservation } from "@workspace/db";

export async function GET(req: NextRequest) {
  try {
    // Verify admin session
    const token = req.cookies.get("admin_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifySession(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create public client for Celo
    const client = createPublicClient({
      chain: celo,
      transport: http(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || "https://forno.celo.org"),
    });

    // Fetch contract data
    const [payoutToken, checkInAmount, maxDailyCheckIns, currentDay, dailyCheckInCount] =
      await client.multicall({
        contracts: [
          {
            address: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
            abi: PAYOUT_CLAIMS_ABI,
            functionName: "PAYOUT_TOKEN",
          },
          {
            address: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
            abi: PAYOUT_CLAIMS_ABI,
            functionName: "checkInAmount",
          },
          {
            address: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
            abi: PAYOUT_CLAIMS_ABI,
            functionName: "maxDailyCheckIns",
          },
          {
            address: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
            abi: PAYOUT_CLAIMS_ABI,
            functionName: "currentDay",
          },
          {
            address: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
            abi: PAYOUT_CLAIMS_ABI,
            functionName: "dailyCheckInCount",
            args: [BigInt(0)], // Will be replaced with actual day
          },
        ],
      });

    // Get token decimals
    const [decimals] = await client.multicall({
      contracts: [
        {
          address: payoutToken.result as `0x${string}`,
          abi: ERC20_METADATA_ABI,
          functionName: "decimals",
        },
      ],
    });

    // Get token balance
    const [balance] = await client.multicall({
      contracts: [
        {
          address: payoutToken.result as `0x${string}`,
          abi: [
            {
              type: "function",
              name: "balanceOf",
              inputs: [{ name: "account", type: "address" }],
              outputs: [{ name: "", type: "uint256" }],
              stateMutability: "view",
            },
          ],
          functionName: "balanceOf",
          args: [PAYOUT_CLAIM_CONTRACT as `0x${string}`],
        },
      ],
    });

    // Get actual daily count for current day
    const [actualDailyCount] = await client.multicall({
      contracts: [
        {
          address: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
          abi: PAYOUT_CLAIMS_ABI,
          functionName: "dailyCheckInCount",
          args: [currentDay.result as bigint],
        },
      ],
    });

    // Calculate runways
    const balanceNum = Number(formatUnits(balance.result as bigint, decimals.result as number));
    const checkInAmountNum = Number(formatUnits(checkInAmount.result as bigint, decimals.result as number));
    const maxDaily = Number(maxDailyCheckIns.result);
    const claimsUsed = Number(actualDailyCount.result);

    const theoreticalRunway =
      checkInAmountNum > 0 && maxDaily > 0
        ? Math.floor(balanceNum / checkInAmountNum / maxDaily)
        : Infinity;

    // Fetch actual average from MongoDB
    await dbConnect();
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
    const avgClaims = await CheckInReservation.aggregate([
      {
        $match: {
          status: "claimed",
          createdAt: { $gte: new Date(sevenDaysAgo * 1000) },
        },
      },
      {
        $group: {
          _id: "$utcDay",
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          avgDaily: { $avg: "$count" },
        },
      },
    ]);

    const avgDailyClaims = avgClaims[0]?.avgDaily ?? 0;
    const actualRunway =
      checkInAmountNum > 0 && avgDailyClaims > 0
        ? Math.floor(balanceNum / checkInAmountNum / avgDailyClaims)
        : Infinity;

    return NextResponse.json({
      balance: balanceNum.toFixed(2),
      checkInAmount: checkInAmountNum.toFixed(2),
      maxDailyCheckIns: maxDaily,
      currentDay: Number(currentDay.result),
      claimsUsedToday: claimsUsed,
      theoreticalRunway: theoreticalRunway === Infinity ? "∞" : theoreticalRunway,
      actualRunway: actualRunway === Infinity ? "∞" : actualRunway,
    });
  } catch (error: any) {
    console.error("Payouts fetch failed:", error.message);
    return NextResponse.json({ error: "Failed to fetch payout data" }, { status: 500 });
  }
}
