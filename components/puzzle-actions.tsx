"use client"

import { useEffect, useState } from "react"

interface PuzzleActionsProps {
  onRetry?: () => void
}

export default function PuzzleActions({ onRetry }: PuzzleActionsProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div
      className="flex flex-col gap-3 w-full"
      style={{
        animation: "slideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 300ms forwards",
        opacity: 0,
      }}
    >
      <button
        onClick={onRetry}
        className="w-full border-4 border-black bg-orange-400 px-4 py-4 font-black text-lg uppercase tracking-widest text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
      >
        🔄 RETRY PUZZLE
      </button>
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) rotate(1deg);
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
