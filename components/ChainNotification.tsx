'use client'

import { useEffect, useState } from 'react'
import { useChainId } from 'wagmi'
import { isOnCorrectChain, PREFERRED_CHAIN } from '../lib/config/wagmi'

export function ChainNotification() {
  const chainId = useChainId()
  const [show, setShow] = useState(false)
  const [isWrongChain, setIsWrongChain] = useState(false)

  useEffect(() => {
    const wrongChain = chainId && !isOnCorrectChain(chainId)
    setIsWrongChain(!!wrongChain)
    
    if (wrongChain) {
      setShow(true)
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setShow(false), 5000)
      return () => clearTimeout(timer)
    } else {
      setShow(false)
    }
  }, [chainId])

  if (!show || !isWrongChain) return null

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
      <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 shadow-lg max-w-sm">
        <div className="flex items-center gap-2">
          <span className="text-yellow-600">⚠️</span>
          <div className="text-sm">
            <div className="font-medium text-yellow-800">Wrong Network</div>
            <div className="text-yellow-700">
              Please switch to {PREFERRED_CHAIN.name} for the best experience.
            </div>
          </div>
          <button
            onClick={() => setShow(false)}
            className="ml-2 text-yellow-600 hover:text-yellow-800"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}