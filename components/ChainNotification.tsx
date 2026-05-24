'use client'

import { useEffect, useState } from 'react'
import { TriangleAlert, X } from 'lucide-react'
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
      <div className="bg-yellow-300 border-4 border-black p-3 shadow-[8px_8px_0px_#000000] max-w-sm">
        <div className="flex items-center gap-2">
          <TriangleAlert className="w-4 h-4 text-black" />
          <div className="text-sm">
            <div className="font-black uppercase text-black">Wrong Network</div>
            <div className="text-black">
              Please switch to {PREFERRED_CHAIN.name} for the best experience.
            </div>
          </div>
          <button
            onClick={() => setShow(false)}
            className="ml-2 bg-black text-white border-2 border-black px-2 py-1 font-black uppercase"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}