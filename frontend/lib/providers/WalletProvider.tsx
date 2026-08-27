'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from '../config/wagmi'
import { AssetBalancesProvider } from '@/lib/hooks/assetBalances'

const queryClient = new QueryClient()

export function WalletProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AssetBalancesProvider>
          {children}
        </AssetBalancesProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}