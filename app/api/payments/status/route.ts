import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { celo } from 'viem/chains';
import { GAME_ASSETS_CONTRACT } from '../../../../lib/config/wagmi';
import { GAME_ASSETS_ABI } from '../../../../lib/abi/gameAssets';

const celoClient = createPublicClient({ chain: celo, transport: http() });

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    const hasDailyAccess = GAME_ASSETS_CONTRACT
      ? await celoClient.readContract({
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: 'hasActiveDailyPass',
          args: [walletAddress as `0x${string}`],
        })
      : false;

    return NextResponse.json({
      hasAccess: hasDailyAccess,
      hasDailyAccess,
      message: hasDailyAccess
        ? 'Daily access active'
        : 'No active access found',
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}