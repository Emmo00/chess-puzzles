"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import StreakBadge from "@/components/streak-badge"
import ChessBoard from "@/components/chess-board"
import RushTimer from "@/components/rush-timer"
import StreakIndicator from "@/components/streak-indicator"
import RushActions from "@/components/rush-actions"
import RoundResults from "@/components/round-results"
import RushPaywall from "@/components/rush-paywall"

export default function RushPage() {
  const [mounted, setMounted] = useState(false)
  const [roundStarted, setRoundStarted] = useState(false)
  const [roundEnded, setRoundEnded] = useState(false)
  const [attemptUsed, setAttemptUsed] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(60)
  const [correct, setCorrect] = useState(0)
  const [incorrect, setIncorrect] = useState(0)
  const [puzzleResults, setPuzzleResults] = useState([
    { id: 1, correct: true },
    { id: 2, correct: true },
    { id: 3, correct: false },
    { id: 4, correct: true },
    { id: 5, correct: false },
  ])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="w-screen h-screen bg-white text-black flex flex-col overflow-hidden">
      {/* Header with Streak Badge and Back Button */}
      <header className="pt-4 px-4 flex justify-between items-center flex-shrink-0">
        <Link
          href="/"
          className="font-black text-sm hover:opacity-70 transition-opacity border-4 border-black px-4 py-2"
        >
          BACK
        </Link>
        <StreakBadge days={12} />
      </header>

      {/* Main Content - No Scroll */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 overflow-hidden gap-4">
        {!roundStarted && !roundEnded && (
          <>
            <div className="text-center">
              <h1 className="text-4xl font-black mb-2">PUZZLE RUSH</h1>
              <p className="text-sm font-bold border-4 border-black px-4 py-2 inline-block">1 Round Daily</p>
            </div>
            <div className="w-full max-w-xs flex-shrink-0">
              <ChessBoard />
            </div>
            <RushActions onStart={() => setRoundStarted(true)} />
          </>
        )}

        {roundStarted && !roundEnded && (
          <>
            <div className="w-full max-w-xs flex-shrink-0">
              <RushTimer timeRemaining={timeRemaining} />
            </div>
            <div className="w-full max-w-xs flex-shrink-0">
              <ChessBoard />
            </div>
            <div className="w-full max-w-xs flex-shrink-0">
              <StreakIndicator correct={correct} incorrect={incorrect} />
            </div>
            <button
              onClick={() => {
                setRoundEnded(true)
                setAttemptUsed(true)
              }}
              className="px-6 py-3 bg-black text-white font-black border-4 border-white text-sm hover:scale-105 active:scale-95 transition-transform"
              style={{
                boxShadow: "4px 4px 0px rgba(0, 0, 0, 0.3)",
              }}
            >
              END ROUND
            </button>
          </>
        )}

        {roundEnded && attemptUsed && !isPremium && <RushPaywall />}

        {roundEnded && !attemptUsed && <RoundResults puzzles={puzzleResults} />}
      </main>
    </div>
  )
}
