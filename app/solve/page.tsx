'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import Link from "next/link"
import StreakBadge from "../components/streak-badge"
import ChessBoard from "../components/chess-board"
import PuzzleCounter from "../components/puzzle-counter"
import PuzzleActions from "../components/puzzle-actions"
import PuzzleProgress from "../components/puzzle-progress"
import PaywallCard from "../components/paywall-card"
import { useUserStats } from "../../lib/hooks/useUserStats"

export default function SolvePage() {
  const [mounted, setMounted] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<{ hasAccess: boolean; hasPremium: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [attemptCount, setAttemptCount] = useState(1)
  const [puzzleProgress, setPuzzleProgress] = useState(2)
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const { userStats } = useUserStats()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isConnected) {
      router.push('/')
      return
    }
    
    if (mounted && address) {
      checkPaymentStatus()
    }
  }, [mounted, address, isConnected, router])

  const checkPaymentStatus = async () => {
    if (!address) return
    
    try {
      const response = await fetch(`/api/payments/status?walletAddress=${address}`)
      if (response.ok) {
        const status = await response.json()
        setPaymentStatus(status)
        
        if (!status.hasAccess) {
          router.push('/')
          return
        }
      }
    } catch (error) {
      console.error('Failed to check payment status:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  if (loading) {
    return (
      <div className="w-screen h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!paymentStatus?.hasAccess) {
    return (
      <div className="w-screen h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Required</h1>
          <p className="text-gray-600 mb-4">You need to purchase access to solve puzzles.</p>
          <Link 
            href="/"
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 inline-block"
          >
            Go Back Home
          </Link>
        </div>
      </div>
    )
  }

  const isAccessExhausted = attemptCount >= 3 && !paymentStatus?.hasPremium

  return (
    <div className="w-screen h-screen bg-white text-black flex flex-col overflow-hidden">
      {/* Header with Streak Badge and Back Button */}
      <header className="pt-4 px-4 flex justify-between items-center shrink-0">
        <Link href="/" className="text-lg font-black hover:opacity-70 transition-opacity">
          Back
        </Link>
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full text-sm ${
            paymentStatus?.hasPremium 
              ? 'bg-green-100 text-green-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {paymentStatus?.hasPremium ? '🏆 Premium' : '⚡ Daily Access'}
          </div>
          <StreakBadge days={userStats?.currentStreak || 0} />
        </div>
      </header>

      {/* Main Content - No Scroll */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 overflow-hidden gap-3">
        <PuzzleCounter remaining={3 - attemptCount} />

        <div className="w-full max-w-xs shrink-0">
          <ChessBoard />
        </div>

        <div className="w-full max-w-xs shrink-0">
          <PuzzleProgress current={puzzleProgress} total={5} />
        </div>

        {!isAccessExhausted && (
          <div className="w-full max-w-xs shrink-0">
            <PuzzleActions onRetry={() => setAttemptCount(attemptCount)} />
          </div>
        )}

        {isAccessExhausted && (
          <div className="w-full max-w-xs shrink-0">
            <PaywallCard />
          </div>
        )}
      </main>
    </div>
  )
}
