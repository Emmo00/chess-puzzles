'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import {
  BadgeCheck,
  Castle,
  Coins,
  CreditCard,
  OctagonAlert,
  PartyPopper,
  RefreshCw,
  Search,
  Smartphone,
  Target,
  X,
  Zap,
} from 'lucide-react'
import { usePayment } from '../lib/hooks/usePayment'
import { PaymentType } from '../lib/types/payment'
import { TelegramSupportLink } from './TelegramSupportLink'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const { address } = useAccount()
  const { makePayment, verifyPayment, getPreferredToken, isPaymentPending, isConfirming, isSuccess, transactionHash, paymentPhase } = usePayment()
  const [selectedPayment, setSelectedPayment] = useState<PaymentType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [preferredToken, setPreferredToken] = useState<any | null>(null)
  const modalScrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const t = await getPreferredToken()
        setPreferredToken(t)
      } catch (e) {
        // ignore
      }
    })()
  }, [address])

  // Auto-verify payment when transaction is successful
  useEffect(() => {
    if (isSuccess && transactionHash && !isVerifying) {
      handleVerifyPayment()
    }
  }, [isSuccess, transactionHash])

  useEffect(() => {
    if (!error) return

    modalScrollRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }, [error])

  const handlePayment = async (type: PaymentType) => {
    if (!address) {
      setError('Please connect your wallet first')
      return
    }

    try {
      setError(null)
      setSelectedPayment(type)
      await makePayment(type)
    } catch (error: any) {
      console.error('Payment error:', error)
      const short = error?.shortMessage || error?.short || (error instanceof Error ? error.message : String(error))
      setError(short || 'Payment failed')
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
      const errAny = error as any
      const errorMessage = errAny?.shortMessage || errAny?.short || (error instanceof Error ? error.message : 'Failed to verify payment')
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

  const monthlyLoading = selectedPayment === PaymentType.PREMIUM_MONTHLY && (isPaymentPending || isConfirming || isVerifying)
  const yearlyLoading = selectedPayment === PaymentType.PREMIUM_YEARLY && (isPaymentPending || isConfirming || isVerifying)
  const dailyLoading = selectedPayment === PaymentType.DAILY_ACCESS && (isPaymentPending || isConfirming || isVerifying)
  const showTransactionLoader = isPaymentPending || isConfirming
  const approveActive = paymentPhase === 'signing-approve' || paymentPhase === 'approving'
  const depositActive = paymentPhase === 'signing-deposit' || paymentPhase === 'depositing' || paymentPhase === 'confirming'
  const approveComplete = depositActive || isConfirming || isSuccess
  const depositComplete = isConfirming || isSuccess

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 p-4 flex items-center justify-center pointer-events-auto" >
      {/* Neo-brutalist backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={handleClose}
      />

      {/* Neo-brutalist modal */}
      <div className="relative bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] max-w-md w-full transform rotate-1 max-h-[90vh] overflow-hidden">
        <div className="bg-orange-400 border-b-4 border-black p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase tracking-wider text-black flex items-center gap-2">
              <BadgeCheck className="w-5 h-5" /> Go Premium
            </h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 bg-red-500 border-2 border-black text-black hover:bg-red-400 transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={isPaymentPending || isConfirming || isVerifying}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div ref={modalScrollRef} className="p-6 bg-white overflow-auto max-h-[calc(90vh-6rem)]">
          {error && (
            <div className="bg-red-400 border-4 border-black p-4 mb-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform -rotate-1 text-left">
              <div className="font-black text-black text-sm uppercase tracking-wide flex items-center gap-2 mb-2">
                <OctagonAlert className="w-4 h-4 shrink-0" /> {error}
              </div>
              <TelegramSupportLink />
            </div>
          )}

          {!isSuccess && !isVerifying && (
            <div className="space-y-4">
              {/* Premium Plans */}
              <div className="bg-amber-100 border-4 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform -rotate-1">
                <div className="flex justify-between items-center mb-3">

                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-3 bg-white border-2 border-black text-center flex flex-col">
                    <div className="font-black">Monthly</div>
                    <div className="font-bold text-xl">$2</div>
                    <button
                      onClick={() => handlePayment(PaymentType.PREMIUM_MONTHLY)}
                      className="w-full bg-black text-white py-2 px-3 font-black text-sm border-2 border-black hover:bg-gray-800 transition-all flex items-center justify-center gap-2 mt-auto"
                      disabled={isPaymentPending || isConfirming || Boolean(selectedPayment && selectedPayment !== PaymentType.PREMIUM_MONTHLY)}
                    >
                      {monthlyLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Processing...
                        </>
                      ) : (
                        'Start Monthly'
                      )}
                    </button>
                  </div>

                  <div className="p-3 bg-white border-2 border-black text-center flex flex-col">
                    <div className="font-black">Yearly</div>
                    <div className="font-bold text-xl">$20</div>
                    <div className="text-xs mt-1">Best value · Save 2 months</div>
                    <button
                      onClick={() => handlePayment(PaymentType.PREMIUM_YEARLY)}
                      className="w-full bg-black text-white py-2 px-3 font-black text-sm border-2 border-black hover:bg-gray-800 transition-all flex items-center justify-center gap-2 mt-auto"
                      disabled={isPaymentPending || isConfirming || Boolean(selectedPayment && selectedPayment !== PaymentType.PREMIUM_YEARLY)}
                    >
                      {yearlyLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Processing...
                        </>
                      ) : (
                        'Start Yearly'
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-black font-bold text-sm mb-2 uppercase tracking-wide flex items-center gap-1">
                  <Zap className="w-4 h-4" /> Unlimited puzzles, golden badge on leaderboard and more
                </p>
              </div>

              {/* Daily Access Option */}
              <div className="bg-cyan-300 border-4 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform rotate-1">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-black text-lg uppercase text-black flex items-center gap-2">
                    <Target className="w-5 h-5" /> Daily Pass
                  </h3>
                  <span className="bg-black text-cyan-300 px-3 py-1 font-black text-xl border-2 border-cyan-300">
                    $0.10
                  </span>
                </div>
                <p className="text-black font-bold text-sm mb-2 uppercase tracking-wide flex items-center gap-1">
                  <Zap className="w-4 h-4" /> Unlimited puzzles today!
                </p>
                <p className="text-black font-bold text-xs mb-4 opacity-80">
                  Solve unlimited chess puzzles for 24 hours
                </p>
                <button
                  onClick={() => handlePayment(PaymentType.DAILY_ACCESS)}
                  className="w-full bg-black text-cyan-300 py-3 px-4 font-black text-sm uppercase tracking-wider border-2 border-cyan-300 hover:bg-gray-800 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:transform hover:-translate-x-1 hover:-translate-y-1 flex items-center justify-center gap-2"
                  disabled={isPaymentPending || isConfirming || Boolean(selectedPayment && selectedPayment !== PaymentType.DAILY_ACCESS)}
                >
                  {dailyLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" /> {preferredToken ? `PAY with ${preferredToken.symbol}` : 'PAY'}
                    </>
                  )}
                </button>
              </div>

              {/* Footer Info */}
              <div className="bg-yellow-200 border-2 border-black p-3 transform rotate-1 mt-4">
                <p className="text-xs font-bold text-black uppercase tracking-wide text-center flex items-center justify-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" /> Powered by MiniPay on Celo Network
                </p>
              </div>
            </div>
          )}

          {showTransactionLoader && (
            <div className="text-center py-8">
              {/* Neo-brutalist loading */}
              <div className="bg-purple-400 border-4 border-black p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform -rotate-2 text-left">
                <div className="bg-black text-purple-400 border-2 border-black p-3 mb-4 font-black uppercase tracking-wider text-xs shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                  Approve first, then deposit
                </div>

                <h3 className="font-black text-xl uppercase mb-2 text-black tracking-wider flex items-center gap-2">
                  {isConfirming ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  {paymentPhase === 'signing-approve' && 'Sign approve'}
                  {paymentPhase === 'approving' && 'Waiting for approve confirmation'}
                  {paymentPhase === 'signing-deposit' && 'Sign deposit'}
                  {paymentPhase === 'depositing' && 'Waiting for deposit confirmation'}
                  {paymentPhase === 'confirming' && 'Final confirmation'}
                </h3>

                <p className="font-bold text-black text-sm uppercase tracking-wide flex items-center gap-1 mb-4">
                  <Coins className="w-4 h-4" /> Two signatures, one premium unlock
                </p>

                <div className="space-y-3">
                  <div className={`border-4 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] ${approveComplete ? 'bg-lime-300' : approveActive ? 'bg-yellow-300 transform -translate-x-1' : 'bg-white'}`}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="font-black uppercase tracking-wider text-sm text-black">Step 1: Approve</span>
                      <span className="bg-black text-white px-2 py-1 text-[10px] font-black uppercase tracking-wide">
                        {approveComplete ? 'Done' : approveActive ? 'Signing' : 'Next'}
                      </span>
                    </div>
                    <p className="text-black font-bold text-xs uppercase tracking-wide">
                      Allow the revenue contract to spend the selected stablecoin.
                    </p>
                  </div>

                  <div className={`border-4 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] ${depositComplete ? 'bg-lime-300' : depositActive ? 'bg-cyan-300 transform translate-x-1' : 'bg-white'}`}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="font-black uppercase tracking-wider text-sm text-black">Step 2: Deposit</span>
                      <span className="bg-black text-white px-2 py-1 text-[10px] font-black uppercase tracking-wide">
                        {depositComplete ? 'Done' : depositActive ? 'Signing' : 'Waiting'}
                      </span>
                    </div>
                    <p className="text-black font-bold text-xs uppercase tracking-wide">
                      After approve confirms, deposit the payment to unlock premium.
                    </p>
                  </div>
                </div>

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
                  <span className="inline-flex items-center gap-2">
                    <Search className="w-5 h-5" /> Verifying Payment...
                  </span>
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
                <div className="mb-4 flex justify-center">
                  <PartyPopper className="w-14 h-14 animate-bounce" />
                </div>
                <h3 className="font-black text-2xl uppercase mb-2 text-black tracking-wider">
                  Success!
                </h3>
                <p className="font-bold text-black uppercase tracking-wide flex items-center justify-center gap-2">
                  <BadgeCheck className="w-5 h-5" /> Access Granted!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}