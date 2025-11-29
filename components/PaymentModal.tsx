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

  // Auto-verify payment when transaction is successful
  useEffect(() => {
    if (isSuccess && transactionHash) {
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
    try {
      const verified = await verifyPayment()
      if (verified) {
        onSuccess()
        onClose()
      } else {
        setError('Payment verification failed. Please contact support.')
      }
    } catch (error) {
      console.error('Verification error:', error)
      setError('Failed to verify payment')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Access Chess Puzzles</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isPaymentPending || isConfirming}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!isPaymentPending && !isConfirming && !isSuccess && (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Daily Access</h3>
                <span className="text-xl font-bold text-blue-600">$0.10</span>
              </div>
              <p className="text-gray-600 text-sm mb-3">
                Solve 3 puzzles today with cUSD payment
              </p>
              <button
                onClick={() => handlePayment(PaymentType.DAILY_ACCESS)}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                📱 Pay $0.10 cUSD
              </button>
            </div>

            <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors border-green-200">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-green-700">Premium (Best Value)</h3>
                <span className="text-xl font-bold text-green-600">$1.00</span>
              </div>
              <p className="text-gray-600 text-sm mb-3">
                Unlimited puzzles for 30 days
              </p>
              <button
                onClick={() => handlePayment(PaymentType.PREMIUM)}
                className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
              >
                📱 Pay $1.00 cUSD
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Payments are made using cUSD on Celo via MiniPay.
              Make sure you have sufficient cUSD balance in your MiniPay wallet.
            </p>
          </div>
        )}

        {(isPaymentPending || isConfirming) && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="font-semibold mb-2">
              {isPaymentPending ? 'Processing Payment...' : 'Confirming Transaction...'}
            </h3>
            <p className="text-gray-600">
              {selectedPayment === PaymentType.DAILY_ACCESS 
                ? 'Paying $0.10 cUSD for daily access' 
                : 'Paying $1.00 cUSD for premium access'}
            </p>
            {transactionHash && (
              <p className="text-xs text-gray-500 mt-2 break-all">
                Transaction: {transactionHash}
              </p>
            )}
          </div>
        )}

        {isSuccess && (
          <div className="text-center py-8">
            <div className="text-green-500 text-4xl mb-4">✓</div>
            <h3 className="font-semibold mb-2">Payment Successful!</h3>
            <p className="text-gray-600">
              Verifying your payment...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}