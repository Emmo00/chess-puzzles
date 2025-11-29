"use client"

import { useState, useEffect } from "react"

interface RushActionsProps {
  onStart: () => void
}

export default function RushActions({ onStart }: RushActionsProps) {
  const [pulse, setPulse] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((prev) => !prev)
    }, 600)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex gap-3 w-full">
      <button
        onClick={onStart}
        className="flex-1 px-4 py-4 bg-cyan-400 text-black font-black border-6 border-black text-sm uppercase tracking-wider hover:scale-105 active:scale-95 transition-transform"
        style={{
          boxShadow: pulse ? "0 0 0 4px rgba(34, 197, 94, 0.4)" : "none",
          transform: pulse ? "scale(1.02)" : "scale(1)",
        }}
      >
        START ROUND
      </button>
    </div>
  )
}
