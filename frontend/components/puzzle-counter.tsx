"use client"

import { useEffect, useState } from "react"

interface PuzzleCounterProps {
  remaining: number
}

export default function PuzzleCounter({ remaining }: PuzzleCounterProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const displayRemaining = remaining === Infinity ? '∞' : remaining;

  return (
    <div
      className="animate-in fade-in slide-in-from-top-4 duration-700"
      style={{
        animation: "slideInDown 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
      }}
    >
      <div
        className="border-4 border-black bg-cyan-400 px-6 py-3 font-black text-lg tracking-wider uppercase text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
      >
        <span>PUZZLES LEFT: </span>
        <span className="font-black">{displayRemaining}</span>
      </div>
      <style jsx>{`
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-40px) rotate(2deg);
          }
          to {
            opacity: 1;
            transform: translateY(0) rotate(0deg);
          }
        }
      `}</style>
    </div>
  )
}
