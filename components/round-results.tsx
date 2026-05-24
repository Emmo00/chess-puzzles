"use client"

import { useState } from "react"
import { Check, X } from "lucide-react"

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
      <h2 className="text-2xl font-black text-center border-4 border-black p-3 bg-yellow-300 shadow-[5px_5px_0px_#000000]">ROUND RESULTS</h2>

      <div className="flex flex-col gap-2">
        {puzzles.map((puzzle) => (
          <button
            key={puzzle.id}
            onClick={() => setRetryingId(puzzle.id)}
            className={`p-4 border-4 border-black font-black text-sm flex justify-between items-center transition-all shadow-[5px_5px_0px_#000000] ${
              puzzle.correct ? "bg-lime-300" : "bg-red-300 hover:scale-105"
            }`}
            style={{
              boxShadow: "5px 5px 0px #000000",
            }}
          >
            <span>Puzzle {puzzle.id}</span>
            <span className="text-xl">
              {puzzle.correct ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </span>
          </button>
        ))}
      </div>

      {retryingId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-8 border-black p-8 max-w-sm w-full shadow-[10px_10px_0px_#000000]">
            <h3 className="text-xl font-black mb-6 bg-cyan-300 border-4 border-black p-2 shadow-[4px_4px_0px_#000000]">RETRY PUZZLE {retryingId}</h3>
            <div className="mb-6 border-4 border-black aspect-square bg-yellow-100 flex items-center justify-center shadow-[4px_4px_0px_#000000]">
              <span className="text-black font-black uppercase">Chess Board</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setRetryingId(null)}
                className="flex-1 px-4 py-3 bg-black text-white font-black border-4 border-black hover:translate-x-[-1px] hover:translate-y-[-1px] transition-transform shadow-[4px_4px_0px_#000000]"
              >
                SUBMIT
              </button>
              <button
                onClick={() => setRetryingId(null)}
                className="flex-1 px-4 py-3 bg-yellow-200 text-black font-black border-4 border-black hover:translate-x-[-1px] hover:translate-y-[-1px] transition-transform shadow-[4px_4px_0px_#000000]"
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
