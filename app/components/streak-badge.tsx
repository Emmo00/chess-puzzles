"use client"

import { useEffect, useState } from "react"

interface StreakBadgeProps {
  days: number
}

export default function StreakBadge({ days }: StreakBadgeProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div
      className="animate-in fade-in slide-in-from-right-4 duration-700"
      style={{
        animation: "slideInRight 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
      }}
    >
      <div
        className="border-4 border-white px-6 py-3 bg-black font-black text-sm tracking-wider uppercase hover:scale-105 transition-transform duration-300 cursor-pointer"
        style={{
          boxShadow: "8px 8px 0px rgba(255, 255, 255, 0.15), 12px 12px 0px rgba(255, 255, 255, 0.05)",
        }}
      >
        Streak: {days} days
      </div>
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
