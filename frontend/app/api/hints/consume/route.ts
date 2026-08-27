import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, type Hex } from "viem";
import { celo } from "viem/chains";
import dbConnect from "@/lib/db";
import { authenticateWalletUser } from "@/lib/auth";
import userModel from "@/lib/models/users.model";
import HintsService from "@/lib/services/hints.service";
import { devErrorBody } from "@/lib/utils/devResponse";
import { maskAddress } from "@/lib/logger";
import { runRequest, type Logger } from "@/lib/api/withLogging";
import { GAME_ASSETS_CONTRACT } from "@/lib/config/wagmi";
import { GAME_ASSETS_ABI } from "@/lib/abi/gameAssets";

const celoClient = createPublicClient({ chain: celo, transport: http() });

async function readContractHintBalance(walletAddress: string): Promise<number> {
  if (!GAME_ASSETS_CONTRACT) return 0;
  try {
    const value = await celoClient.readContract({
      address: GAME_ASSETS_CONTRACT,
      abi: GAME_ASSETS_ABI,
      functionName: "getHintBalance",
      args: [walletAddress as Hex],
    });
    return Number(value);
  } catch {
    return 0;
  }
}

const handle = async (request: NextRequest, log: Logger): Promise<NextResponse> => {
  // Log request receipt + identity context (extracted before auth so failures are visible).
  const rawWallet =
    request.headers.get("x-wallet-address") ||
    (request.headers.get("authorization")?.startsWith("Bearer ")
      ? request.headers.get("authorization")!.substring(7)
      : new URL(request.url).searchParams.get("walletAddress") || undefined);

  log.info("hint.consume.request", { wallet: maskAddress(rawWallet) });

  // Environment diagnostics to rule out config root causes immediately.
  log.debug("hint.consume.serverConfig", {
    hasConsumerKey: !!process.env.CONSUMER_PRIVATE_KEY,
    hasGameAssetsContract: !!GAME_ASSETS_CONTRACT,
  });

  let dbHintBalance = 0;
  let contractHintBalance = 0;

  try {
    await dbConnect();
    const user = await authenticateWalletUser(request);
    const lower = user.walletAddress.toLowerCase();
    log.info("hint.consume.identity", { wallet: maskAddress(lower) });

    // Inspect the user's existing DB free-hint balance for diagnostics.
    const preUser = await userModel.findOne({ walletAddress: lower });
    dbHintBalance = preUser?.hintBalance ?? 0;

    // Read the on-chain hint balance for diagnostics/validation.
    contractHintBalance = await readContractHintBalance(lower);

    const totalHints = dbHintBalance + contractHintBalance;
    log.info("hint.consume.balances", {
      wallet: maskAddress(lower),
      dbHintBalance,
      contractHintBalance,
      totalHints,
    });

    if (totalHints <= 0) {
      log.info("hint.consume.noHints", { wallet: maskAddress(lower), totalHints });
      return NextResponse.json(
        { success: false, message: "Out of hints. Buy more in the store." },
        { status: 400 },
      );
    }

    // Try to consume from DB free allowance first.
    const dbUser = await userModel.findOneAndUpdate(
      { walletAddress: lower, hintBalance: { $gt: 0 } },
      { $inc: { hintBalance: -1 } },
      { returnDocument: "after" },
    );

    if (dbUser) {
      const newDbBalance = dbUser.hintBalance ?? 0;
      log.info("hint.consume.free", {
        wallet: maskAddress(lower),
        dbHintBalance: newDbBalance,
        consumedFrom: "database",
      });
      return NextResponse.json({
        success: true,
        source: "free",
        totalHints: newDbBalance + contractHintBalance,
      });
    }

    // Fall through to contract for purchased hints.
    log.info("hint.consume.contract.start", {
      wallet: maskAddress(lower),
      contractHintBalance,
    });
    const hintsService = new HintsService();
    const result = await hintsService.consumeHint(lower);
    log.info("hint.consume.contract.success", {
      wallet: maskAddress(lower),
      txHash: result.txHash,
    });
    return NextResponse.json({
      ...result,
      source: "contract",
      totalBalance: dbHintBalance + Math.max(0, contractHintBalance - 1),
    });
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error("hint.consume.failed", err, {
      wallet: maskAddress(rawWallet),
      dbHintBalance,
      contractHintBalance,
      errorStatus: error?.status,
    });
    return NextResponse.json(
      {
        message: error?.message || "Failed to consume hint",
        ...devErrorBody(error),
      },
      { status: error?.status || 500 },
    );
  }
};

export async function POST(request: NextRequest) {
  return runRequest(request, "/api/hints/consume", handle);
}

export async function GET(request: NextRequest) {
  return runRequest(request, "/api/hints/consume", async (req) => {
    try {
      const user = await authenticateWalletUser(req);
      const lower = user.walletAddress.toLowerCase();
      const preUser = await userModel.findOne({ walletAddress: lower });
      const db = preUser?.hintBalance ?? 0;
      const contractHintBalance = await readContractHintBalance(lower);
      return NextResponse.json({
        success: true,
        db,
        contractHintBalance,
        totalHints: db + contractHintBalance,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      return NextResponse.json(
        { message: err.message || "Failed to fetch hint balance" },
        { status: error?.status || 500 },
      );
    }
  });
}