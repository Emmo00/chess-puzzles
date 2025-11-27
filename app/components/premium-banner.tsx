"use client"

import { useEffect, useState } from "react"

export default function PremiumBanner() {
  const [mounted, setMounted] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div
      className="flex-shrink-0 w-full px-4 py-3"
      style={{
        animation: "slideUpBanner 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 200ms forwards",
        opacity: 0,
      }}
    >
      <div className="border-3 border-black bg-gradient-to-r from-yellow-300 via-yellow-200 to-yellow-300 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-black">Premium: $1/month</p>
            <p className="text-[10px] font-bold text-black/70">Unlimited puzzles • Unlimited rush • Exclusive boosts</p>
          </div>
          <button
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="border-3 border-black px-3 py-2 bg-black text-yellow-300 font-black text-xs uppercase whitespace-nowrap transition-all duration-200 flex-shrink-0"
            style={{
              boxShadow: isHovered ? "4px 4px 0px rgba(0, 0, 0, 0.4)" : "2px 2px 0px rgba(0, 0, 0, 0.2)",
              transform: isHovered ? "translate(-1px, -1px) scale(1.03)" : "translate(0, 0)",
            }}
          >
            Upgrade
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes slideUpBanner {
          from {
            opacity: 0;
            transform: translateY(20px);
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
