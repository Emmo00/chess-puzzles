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

  return (
    <div
      className="animate-in fade-in slide-in-from-top-4 duration-700"
      style={{
        animation: "slideInDown 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
      }}
    >
      <div
        className="border-4 border-black bg-cyan-400 px-6 py-3 font-black text-sm tracking-wider uppercase text-black"
        style={{
          boxShadow: "4px 4px 0px rgba(0, 0, 0, 0.2)",
        }}
      >
        <span>Daily Puzzles: </span>
        <span className="font-black">{remaining}/3 Remaining</span>
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
