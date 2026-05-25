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
import confetti from 'canvas-confetti'
import { usePayment } from '../lib/hooks/usePayment'
import { PaymentType } from '../lib/types/payment'
import { getPremiumPlan } from '../lib/config/premium'
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
  const [celebration, setCelebration] = useState<{
    title: string
    subtitle: string
    expiresAt: string
  } | null>(null)
  const modalScrollRef = useRef<HTMLDivElement | null>(null)
  const confettiFiredRef = useRef(false)

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

  useEffect(() => {
    if (!celebration || confettiFiredRef.current) return

    confettiFiredRef.current = true

    const burst = (particleCount: number, spread: number, originY: number) => {
      confetti({
        particleCount,
        spread,
        startVelocity: 38,
        scalar: 1.05,
        origin: { y: originY },
        colors: ['#facc15', '#22c55e', '#60a5fa', '#ffffff', '#000000'],
      })
    }

    burst(120, 80, 0.55)
    window.setTimeout(() => burst(80, 55, 0.4), 180)
    window.setTimeout(() => burst(80, 55, 0.7), 360)

    return () => {
      confettiFiredRef.current = false
    }
  }, [celebration])

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
        const plan = selectedPayment ? getPremiumPlan(selectedPayment) : null
        const expiresAt = new Date(
          Date.now() + (plan?.durationDays ?? 1) * 24 * 60 * 60 * 1000,
        )

        setCelebration({
          title: plan?.label ?? 'Premium',
          subtitle: selectedPayment === PaymentType.DAILY_ACCESS
            ? 'Daily access activated'
            : 'Subscription activated',
          expiresAt: expiresAt.toLocaleString([], {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
        })
        setIsVerifying(false)
        onSuccess()
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
    setCelebration(null)
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
    <div className="fixed inset-0 z-100000 p-4 flex items-center justify-center pointer-events-auto">
      {/* Neo-brutalist backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={handleClose}
      />

      {/* Neo-brutalist modal */}
      <div className="relative isolate bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] max-w-md w-full transform rotate-1 max-h-[90vh] overflow-hidden">
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
            <>
              <div className="bg-red-400 border-4 border-black p-4 mb-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform -rotate-1 text-left">
                <div className="font-black text-black text-sm uppercase tracking-wide flex items-center gap-2 mb-2">
                  <OctagonAlert className="w-4 h-4 shrink-0" /> {error}
                </div>
                <TelegramSupportLink />
              </div>
            </>
          )}

          {celebration && (
            <div className="space-y-4">
              <div className="bg-lime-300 border-4 border-black p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] transform -rotate-1 text-left">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="font-black text-2xl uppercase tracking-wider text-black flex items-center gap-2">
                    <BadgeCheck className="w-6 h-6" /> Activated
                  </h3>
                  <div className="bg-black text-lime-300 px-3 py-1 font-black uppercase tracking-wider text-[10px] border-2 border-black">
                    Premium live
                  </div>
                </div>

                <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform rotate-1 mb-4">
                  <p className="font-black text-black text-xl uppercase tracking-wider">{celebration.title}</p>
                  <p className="font-bold text-black text-sm uppercase tracking-wide mt-1">{celebration.subtitle}</p>
                </div>

                <div className="space-y-2 text-black font-bold text-sm uppercase tracking-wide">
                  <div className="bg-white border-2 border-black px-3 py-2 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                    Unlimited puzzles unlocked
                  </div>
                  <div className="bg-white border-2 border-black px-3 py-2 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                    Expires: {celebration.expiresAt}
                  </div>
                </div>

                <div className="mt-4 bg-black text-lime-300 border-4 border-black p-3 font-black uppercase tracking-wider text-xs shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                  Enjoy the board. The crown is yours.
                </div>
              </div>
            </div>
          )}

          {!celebration && !isSuccess && !isVerifying && (
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

          {showTransactionLoader && !celebration && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
              <div className="relative w-full max-w-lg -rotate-1">
                <div className="absolute inset-0 translate-x-3 translate-y-3 bg-black" aria-hidden="true" />
                <div className="relative border-4 border-black bg-yellow-300 p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="bg-white text-black px-3 py-1 border-2 border-black font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                      Celo · Secure
                    </div>
                  </div>

                  <div className="mb-5 border-4 border-black bg-white p-3 sm:p-4 shadow-[5px_5px_0px_rgba(0,0,0,1)] transform rotate-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-3 w-3 bg-black" />
                      <p className="font-black uppercase tracking-[0.22em] text-black text-xs sm:text-sm">
                        Approve first, then deposit
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] items-stretch">
                    <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform -rotate-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`h-10 w-10 flex items-center justify-center border-4 border-black ${approveComplete ? 'bg-lime-300' : approveActive ? 'bg-yellow-300 animate-pulse' : 'bg-white'}`}>
                          {approveComplete ? <BadgeCheck className="w-5 h-5 text-black" /> : approveActive ? <RefreshCw className="w-5 h-5 animate-spin text-black" /> : <span className="font-black text-black">1</span>}
                        </div>
                        <div>
                          <div className="font-black text-black uppercase tracking-wide text-sm sm:text-base">Approve</div>
                          <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-black">
                            {approveComplete ? 'Approved' : approveActive ? 'Approving...' : 'Waiting for signature'}
                          </div>
                        </div>
                      </div>
                      <div className="h-3 border-2 border-black bg-black overflow-hidden">
                        <div className={`h-full bg-white transition-all duration-500 ${approveComplete ? 'w-full' : approveActive ? 'w-2/3' : 'w-0'}`} />
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center justify-center px-1">
                      <div className={`h-1 w-8 border border-black ${approveComplete ? 'bg-lime-300' : 'bg-black'}`} />
                    </div>

                    <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform rotate-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`h-10 w-10 flex items-center justify-center border-4 border-black ${depositComplete ? 'bg-lime-300' : depositActive ? 'bg-cyan-300 animate-pulse' : 'bg-white'}`}>
                          {depositComplete ? <BadgeCheck className="w-5 h-5 text-black" /> : depositActive ? <RefreshCw className="w-5 h-5 animate-spin text-black" /> : <span className="font-black text-black">2</span>}
                        </div>
                        <div>
                          <div className="font-black text-black uppercase tracking-wide text-sm sm:text-base">Deposit</div>
                          <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-black">
                            {depositComplete ? 'Success' : depositActive ? 'Waiting for deposit' : 'Waiting for approve'}
                          </div>
                        </div>
                      </div>
                      <div className="h-3 border-2 border-black bg-black overflow-hidden">
                        <div className={`h-full bg-white transition-all duration-500 ${depositComplete ? 'w-full' : depositActive ? 'w-2/3' : 'w-0'}`} />
                      </div>
                    </div>
                  </div>

                  {transactionHash && (
                    <div className="mt-5 border-4 border-black bg-black text-white p-3 shadow-[4px_4px_0px_rgba(0,0,0,1)] rotate-1">
                      <div className="font-black uppercase tracking-[0.2em] text-[10px] mb-1">Transaction</div>
                      <div className="font-mono text-[11px] break-all">{transactionHash.slice(0, 20)}...</div>
                    </div>
                  )}
                </div>
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