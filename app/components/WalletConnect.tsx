'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { formatAddress } from '@/lib/utils/formatAddress'
import { isMiniPay } from '@/lib/config/wagmi'

export function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [isOpen, setIsOpen] = useState(false)
  const [isMiniPayDetected, setIsMiniPayDetected] = useState(false)

  useEffect(() => {
    setIsMiniPayDetected(isMiniPay())
    
    // Auto-connect for MiniPay users
    if (isMiniPay() && !isConnected && !isPending && connectors.length > 0) {
      const injectedConnector = connectors.find(c => c.type === 'injected')
      if (injectedConnector) {
        connect({ connector: injectedConnector })
      }
    }
  }, [isConnected, isPending, connectors, connect])

  if (isConnected) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors flex items-center gap-2"
        >
          {isMiniPayDetected && <span className="text-xs">📱</span>}
          {formatAddress(address)}
        </button>
        
        {isOpen && (
          <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[200px] z-50">
            <div className="text-sm text-gray-600 mb-2">
              {isMiniPayDetected ? 'Connected via MiniPay:' : 'Connected to:'}
            </div>
            <div className="text-sm font-mono mb-4 break-all">{address}</div>
            <button
              onClick={() => {
                disconnect()
                setIsOpen(false)
              }}
              className="w-full bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    )
  }

  // For MiniPay, show a simplified connect button (auto-connects)
  if (isMiniPayDetected) {
    return (
      <button
        onClick={() => {
          const injectedConnector = connectors.find(c => c.type === 'injected')
          if (injectedConnector) {
            connect({ connector: injectedConnector })
          }
        }}
        disabled={isPending}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        📱 {isPending ? 'Connecting...' : 'Connect MiniPay'}
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[200px] z-50">
          <div className="text-sm font-medium text-gray-900 mb-3">Choose Wallet</div>
          <div className="space-y-2">
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => {
                  connect({ connector })
                  setIsOpen(false)
                }}
                disabled={isPending}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {connector.name}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}