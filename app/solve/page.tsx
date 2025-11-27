"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import StreakBadge from "@/components/streak-badge"
import ChessBoard from "@/components/chess-board"
import PuzzleCounter from "@/components/puzzle-counter"
import PuzzleActions from "@/components/puzzle-actions"
import PuzzleProgress from "@/components/puzzle-progress"
import PaywallCard from "@/components/paywall-card"

export default function SolvePage() {
  const [mounted, setMounted] = useState(false)
  const [attemptCount, setAttemptCount] = useState(1) // 1/3 remaining
  const [isPremium, setIsPremium] = useState(false)
  const [puzzleProgress, setPuzzleProgress] = useState(2)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const isAccessExhausted = attemptCount >= 3 && !isPremium

  return (
    <div className="w-screen h-screen bg-white text-black flex flex-col overflow-hidden">
      {/* Header with Streak Badge and Back Button */}
      <header className="pt-4 px-4 flex justify-between items-center flex-shrink-0">
        <Link href="/" className="text-lg font-black hover:opacity-70 transition-opacity">
          Back
        </Link>
        <StreakBadge days={12} />
      </header>

      {/* Main Content - No Scroll */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 overflow-hidden gap-3">
        <PuzzleCounter remaining={3 - attemptCount} />

        <div className="w-full max-w-xs flex-shrink-0">
          <ChessBoard />
        </div>

        <div className="w-full max-w-xs flex-shrink-0">
          <PuzzleProgress current={puzzleProgress} total={5} />
        </div>

        {!isAccessExhausted && (
          <div className="w-full max-w-xs flex-shrink-0">
            <PuzzleActions onRetry={() => setAttemptCount(attemptCount)} />
          </div>
        )}

        {isAccessExhausted && (
          <div className="w-full max-w-xs flex-shrink-0">
            <PaywallCard />
          </div>
        )}
      </main>
    </div>
  )
}
