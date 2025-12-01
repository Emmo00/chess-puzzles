"use client"

import { useEffect, useState } from "react"

interface PuzzleProgressProps {
  current: number
  total: number
}

export default function PuzzleProgress({ current, total }: PuzzleProgressProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const percentage = (current / total) * 100

  return (
    <div
      className="flex flex-col gap-3 w-full"
      style={{
        animation: "slideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 200ms forwards",
        opacity: 0,
      }}
    >
      <div className="bg-black text-white px-3 py-1 font-black text-sm uppercase tracking-wider border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">PUZZLE PROGRESS</div>
      <div
        className="w-full h-8 bg-white border-4 border-black relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      >
        <div
          className="h-full bg-yellow-400 transition-all duration-500"
          style={{
            width: `${percentage}%`,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center font-black text-sm text-black tracking-wider">
          {current}/{total} MOVES
        </div>
      </div>
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
