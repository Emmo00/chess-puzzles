import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { celo } from 'viem/chains';
import { GAME_ASSETS_CONTRACT } from '../../../../lib/config/wagmi';
import { GAME_ASSETS_ABI } from '../../../../lib/abi/gameAssets';
import { runRequest } from "@/lib/api/withLogging";
import { maskAddress } from '@/lib/logger';

const celoClient = createPublicClient({ chain: celo, transport: http() });

export async function GET(request: NextRequest) {
  return runRequest(request, '/api/payments/status', async (req, log) => {
    try {
      const { searchParams } = new URL(req.url);
      const walletAddress = searchParams.get('walletAddress');

      if (!walletAddress) {
        log.warn('payments.status.missingWallet');
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

      log.info('payments.status', {
        wallet: maskAddress(walletAddress),
        hasDailyAccess: !!hasDailyAccess,
      });

      return NextResponse.json({
        hasAccess: hasDailyAccess,
        hasDailyAccess,
        message: hasDailyAccess
          ? 'Daily access active'
          : 'No active access found',
      });

    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error('payments.status.failed', err);
      return NextResponse.json(
        { error: 'Failed to check payment status' },
        { status: 500 }
      );
    }
  });
}