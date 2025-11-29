'use client'

import { useEffect } from 'react'
import { useSwitchChain, useAccount, useChainId } from 'wagmi'
import { PREFERRED_CHAIN, isOnCorrectChain } from '../config/wagmi'

export function useChainSwitching() {
  const { switchChain } = useSwitchChain()
  const { isConnected } = useAccount()
  const chainId = useChainId()

  useEffect(() => {
    const handleChainSwitch = async () => {
      // Only switch if user is connected and not on a Celo chain
      if (isConnected && !isOnCorrectChain(chainId)) {
        try {
          await switchChain({ chainId: PREFERRED_CHAIN.id })
        } catch (error) {
          console.error('Failed to switch chain:', error)
          // You could show a toast notification here
        }
      }
    }

    // Small delay to ensure wallet connection is stable
    if (isConnected) {
      const timeoutId = setTimeout(handleChainSwitch, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [isConnected, chainId, switchChain])

  return {
    isOnCorrectChain: isOnCorrectChain(chainId),
    currentChainId: chainId,
    preferredChain: PREFERRED_CHAIN,
    switchToPreferredChain: () => switchChain({ chainId: PREFERRED_CHAIN.id })
  }
}