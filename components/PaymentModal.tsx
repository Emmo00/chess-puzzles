'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { usePayment } from '../lib/hooks/usePayment'
import { PaymentType } from '../lib/types/payment'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const { address } = useAccount()
  const { makePayment, verifyPayment, isPaymentPending, isConfirming, isSuccess, transactionHash } = usePayment()
  const [selectedPayment, setSelectedPayment] = useState<PaymentType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  // Auto-verify payment when transaction is successful
  useEffect(() => {
    if (isSuccess && transactionHash && !isVerifying) {
      handleVerifyPayment()
    }
  }, [isSuccess, transactionHash])

  const handlePayment = async (type: PaymentType) => {
    if (!address) {
      setError('Please connect your wallet first')
      return
    }

    try {
      setError(null)
      setSelectedPayment(type)
      await makePayment(type)
    } catch (error) {
      console.error('Payment error:', error)
      setError(error instanceof Error ? error.message : 'Payment failed')
      setSelectedPayment(null)
    }
  }

  const handleVerifyPayment = async () => {
    if (isVerifying) return
    
    try {
      setIsVerifying(true)
      setError(null) // Clear any previous errors
      const verified = await verifyPayment()
      if (verified) {
        onSuccess()
        // Close modal after a short delay to show success
        setTimeout(() => {
          onClose()
          setSelectedPayment(null)
          setError(null)
          setIsVerifying(false)
        }, 1500)
      } else {
        setError('Payment verification failed. Please contact support.')
        setIsVerifying(false)
      }
    } catch (error) {
      console.error('Verification error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify payment'
      setError(errorMessage)
      setIsVerifying(false)
    }
  }

  const handleClose = () => {
    if (isPaymentPending || isConfirming || isVerifying) return
    onClose()
    setSelectedPayment(null)
    setError(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 p-4 flex items-center justify-center pointer-events-auto" >
      {/* Neo-brutalist backdrop */}
      <div 
        className="absolute inset-0 bg-black/80"
        onClick={handleClose}
      />
      
      {/* Neo-brutalist modal */}
      <div className="relative bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] max-w-md w-full transform rotate-1">
        <div className="bg-orange-400 border-b-4 border-black p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase tracking-wider text-black">
              🏰 ACCESS PUZZLES
            </h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 bg-red-500 border-2 border-black font-black text-black hover:bg-red-400 transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isPaymentPending || isConfirming || isVerifying}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 bg-white">
          {error && (
            <div className="bg-red-400 border-4 border-black p-4 mb-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform -rotate-1">
              <div className="font-black text-black text-sm uppercase tracking-wide">
                💥 {error}
              </div>
            </div>
          )}

          {!isPaymentPending && !isConfirming && !isSuccess && !isVerifying && (
            <div className="space-y-4">
              {/* Daily Access Option */}
              <div className="bg-cyan-300 border-4 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform rotate-1">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-black text-lg uppercase text-black">🎯 Daily Pass</h3>
                  <span className="bg-black text-cyan-300 px-3 py-1 font-black text-xl border-2 border-cyan-300">
                    $0.10
                  </span>
                </div>
                <p className="text-black font-bold text-sm mb-2 uppercase tracking-wide">
                  ⚡ +3 Extra Puzzles Today!
                </p>
                <p className="text-black font-bold text-xs mb-4 opacity-80">
                  Total: 6 puzzles (3 free + 3 paid)
                </p>
                <button
                  onClick={() => handlePayment(PaymentType.DAILY_ACCESS)}
                  className="w-full bg-black text-cyan-300 py-3 px-4 font-black text-sm uppercase tracking-wider border-2 border-cyan-300 hover:bg-gray-800 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:transform hover:-translate-x-1 hover:-translate-y-1"
                >
                  📱 PAY $0.10 cUSD
                </button>
              </div>

              {/* Premium Option */}
              <div className="bg-green-400 border-4 border-black p-4 shadow-[6px_6px_0px_rgba(0,0,0,1)] transform -rotate-1">
                <div className="bg-yellow-300 border-2 border-black px-2 py-1 inline-block mb-2 transform rotate-2">
                  <span className="font-black text-xs uppercase">👑 Best Value!</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-black text-lg uppercase text-black">💎 Premium</h3>
                  <span className="bg-black text-green-400 px-3 py-1 font-black text-xl border-2 border-green-400">
                    $1.00
                  </span>
                </div>
                <p className="text-black font-bold text-sm mb-4 uppercase tracking-wide">
                  🚀 Unlimited for 1 Month!
                </p>
                <button
                  onClick={() => handlePayment(PaymentType.PREMIUM)}
                  className="w-full bg-black text-green-400 py-3 px-4 font-black text-sm uppercase tracking-wider border-2 border-green-400 hover:bg-gray-800 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:transform hover:-translate-x-1 hover:-translate-y-1"
                >
                  📱 PAY $1.00 cUSD
                </button>
              </div>

              {/* Footer Info */}
              <div className="bg-yellow-200 border-2 border-black p-3 transform rotate-1 mt-4">
                <p className="text-xs font-bold text-black uppercase tracking-wide text-center">
                  💳 Powered by MiniPay on Celo Network
                </p>
              </div>
            </div>
          )}

          {(isPaymentPending || isConfirming) && (
            <div className="text-center py-8">
              {/* Neo-brutalist loading */}
              <div className="bg-purple-400 border-4 border-black p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform -rotate-2">
                <div className="w-16 h-16 mx-auto mb-4 bg-black border-4 border-purple-400 animate-bounce">
                  <div className="w-full h-full bg-purple-400 border-2 border-black animate-pulse"></div>
                </div>
                <h3 className="font-black text-xl uppercase mb-2 text-black tracking-wider">
                  {isPaymentPending ? '⚡ Processing...' : '🔄 Confirming...'}
                </h3>
                <p className="font-bold text-black text-sm uppercase tracking-wide">
                  {selectedPayment === PaymentType.DAILY_ACCESS 
                    ? '💰 Paying $0.10 cUSD' 
                    : '💰 Paying $1.00 cUSD'}
                </p>
                {transactionHash && (
                  <div className="bg-black text-purple-400 p-2 mt-4 border-2 border-purple-400 text-xs font-mono break-all">
                    TX: {transactionHash.slice(0, 20)}...
                  </div>
                )}
              </div>
            </div>
          )}

          {isVerifying && (
            <div className="text-center py-8">
              <div className="bg-blue-400 border-4 border-black p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] transform rotate-1">
                <div className="w-16 h-16 mx-auto mb-4 bg-black border-4 border-blue-400 animate-pulse">
                  <div className="w-full h-full bg-blue-400 border-2 border-black animate-spin"></div>
                </div>
                <h3 className="font-black text-xl uppercase mb-2 text-black tracking-wider">
                  🔍 Verifying Payment...
                </h3>
                <p className="font-bold text-black text-sm uppercase tracking-wide">
                  This may take a few moments while we wait for blockchain confirmation
                </p>
                {transactionHash && (
                  <div className="bg-black text-blue-400 p-2 mt-4 border-2 border-blue-400 text-xs font-mono break-all">
                    TX: {transactionHash.slice(0, 20)}...
                  </div>
                )}
              </div>
            </div>
          )}

          {isSuccess && !isVerifying && (
            <div className="text-center py-8">
              <div className="bg-green-400 border-4 border-black p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] transform rotate-2">
                <div className="text-6xl mb-4 animate-bounce">🎉</div>
                <h3 className="font-black text-2xl uppercase mb-2 text-black tracking-wider">
                  Success!
                </h3>
                <p className="font-bold text-black uppercase tracking-wide">
                  ✅ Access Granted!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}