"use client"

import { useEffect, useState } from "react"

interface StreakBadgeProps {
  days: number
  onClick?: () => void
}

export default function StreakBadge({ days, onClick }: StreakBadgeProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const getStreakEmoji = () => {
    if (days >= 30) return "🔥"
    if (days >= 7) return "⚡"
    if (days >= 3) return "🎯"
    return "🔥"
  }

  return (
    <div
      className="animate-in fade-in slide-in-from-right-4 duration-700"
      style={{
        animation: "slideInRight 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
      }}
    >
      <button
        onClick={onClick}
        className="border-4 border-black px-4 py-2 font-black text-sm tracking-wider uppercase transition-all duration-200 transform hover:scale-105 hover:rotate-2 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] bg-white text-black"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{getStreakEmoji()}</span>
          <div className="flex justify-center items-center gap-1">
            <span className="text-xs leading-none">STREAK:</span>
            <span className="text-lg font-black leading-none">{days}</span>
          </div>
        </div>
      </button>
      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(40px) rotate(-5deg);
          }
          to {
            opacity: 1;
            transform: translateX(0) rotate(0deg);
          }
        }
      `}</style>
    </div>
  )
}
