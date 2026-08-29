import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import { GAME_ASSETS_CONTRACT } from "@workspace/contracts";
import { GAME_ASSETS_ABI } from "@workspace/contracts";
import { GAME_ASSET_TYPES } from "@workspace/contracts";

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

    // Fetch asset packs count
    const [packCount] = await client.multicall({
      contracts: [
        {
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "getAssetPackCount",
        },
      ],
    });

    // Fetch all asset packs
    const assetPacks = [];
    for (let i = 0; i < Number(packCount.result); i++) {
      const [pack] = await client.multicall({
        contracts: [
          {
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: "assetPacks",
            args: [BigInt(i)],
          },
        ],
      });
      assetPacks.push({
        name: pack.result?.[0],
        assetType: pack.result?.[1],
        quantity: Number(pack.result?.[2]),
        price: Number(pack.result?.[3]),
        active: pack.result?.[4],
      });
    }

    // Fetch unit prices
    const [hintPrice, streakFreezePrice] = await client.multicall({
      contracts: [
        {
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "unitPrices",
          args: [GAME_ASSET_TYPES.HINT],
        },
        {
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "unitPrices",
          args: [GAME_ASSET_TYPES.STREAK_FREEZE],
        },
      ],
    });

    // Fetch daily pass config
    const [dailyPassPrice, dailyPassDuration] = await client.multicall({
      contracts: [
        {
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "dailyPassPrice",
        },
        {
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "dailyPassDuration",
        },
      ],
    });

    // Fetch treasury
    const [treasury] = await client.multicall({
      contracts: [
        {
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "treasury",
        },
      ],
    });

    // Fetch payment tokens
    const [tokenCount] = await client.multicall({
      contracts: [
        {
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "getPaymentTokenCount",
        },
      ],
    });

    const paymentTokens = [];
    for (let i = 0; i < Number(tokenCount.result); i++) {
      const [token] = await client.multicall({
        contracts: [
          {
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: "paymentTokens",
            args: [BigInt(i)],
          },
        ],
      });
      paymentTokens.push(token.result);
    }

    return NextResponse.json({
      assetPacks,
      unitPrices: {
        hint: Number(hintPrice.result),
        streakFreeze: Number(streakFreezePrice.result),
      },
      dailyPassPrice: Number(dailyPassPrice.result),
      dailyPassDuration: Number(dailyPassDuration.result),
      treasury: treasury.result,
      paymentTokens,
    });
  } catch (error: any) {
    console.error("Game assets fetch failed:", error.message);
    return NextResponse.json({ error: "Failed to fetch game assets" }, { status: 500 });
  }
}
