"use client"

import { useState } from "react"

interface Puzzle {
  id: number
  correct: boolean
}

interface RoundResultsProps {
  puzzles: Puzzle[]
}

export default function RoundResults({ puzzles }: RoundResultsProps) {
  const [retryingId, setRetryingId] = useState<number | null>(null)

  return (
    <div className="w-full max-w-xs flex flex-col gap-4">
      <h2 className="text-2xl font-black text-center border-4 border-black p-3">ROUND RESULTS</h2>

      <div className="flex flex-col gap-2">
        {puzzles.map((puzzle) => (
          <button
            key={puzzle.id}
            onClick={() => setRetryingId(puzzle.id)}
            className={`p-4 border-4 border-black font-black text-sm flex justify-between items-center transition-all ${
              puzzle.correct ? "bg-lime-300" : "bg-red-300 hover:scale-105"
            }`}
            style={{
              boxShadow: "4px 4px 0px rgba(0, 0, 0, 0.1)",
            }}
          >
            <span>Puzzle {puzzle.id}</span>
            <span className="text-xl">{puzzle.correct ? "✓" : "✗"}</span>
          </button>
        ))}
      </div>

      {retryingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-8 border-black p-8 max-w-sm w-full">
            <h3 className="text-xl font-black mb-6">RETRY PUZZLE {retryingId}</h3>
            <div className="mb-6 border-4 border-black aspect-square bg-gray-100 flex items-center justify-center">
              <span className="text-gray-400 font-black">Chess Board</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setRetryingId(null)}
                className="flex-1 px-4 py-3 bg-black text-white font-black border-4 border-black hover:scale-105 transition-transform"
              >
                SUBMIT
              </button>
              <button
                onClick={() => setRetryingId(null)}
                className="flex-1 px-4 py-3 bg-gray-300 text-black font-black border-4 border-black hover:scale-105 transition-transform"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
