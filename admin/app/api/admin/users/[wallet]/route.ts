import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { dbConnect } from "@workspace/db";
import { User, Payment } from "@workspace/db";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import { GAME_ASSETS_CONTRACT } from "@workspace/contracts";
import { GAME_ASSETS_ABI } from "@workspace/contracts";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await params;
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

    await dbConnect();

    // Fetch user from DB
    const user = await User.findOne({ walletAddress: wallet.toLowerCase() }).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch on-chain balances
    const client = createPublicClient({
      chain: celo,
      transport: http(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || "https://forno.celo.org"),
    });

    const [hints, streakFreezes, hasDailyPass] = await client.multicall({
      contracts: [
        {
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "getHintBalance",
          args: [wallet as `0x${string}`],
        },
        {
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "getStreakFreezeBalance",
          args: [wallet as `0x${string}`],
        },
        {
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "hasActiveDailyPass",
          args: [wallet as `0x${string}`],
        },
      ],
    });

    // Fetch payment history
    const payments = await Payment.find({ walletAddress: wallet.toLowerCase() })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      user,
      onChain: {
        hints: Number(hints.result),
        streakFreezes: Number(streakFreezes.result),
        hasDailyPass: hasDailyPass.result,
      },
      payments,
    });
  } catch (error: any) {
    console.error("User details fetch failed:", error.message);
    return NextResponse.json({ error: "Failed to fetch user details" }, { status: 500 });
  }
}
