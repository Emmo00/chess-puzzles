"use client"

import { useEffect, useState } from "react"

export default function PaywallCard() {
  const [mounted, setMounted] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full"
      style={{
        animation: "slideUpPaywall 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 400ms forwards",
        opacity: 0,
      }}
    >
      <div
        className="border-4 border-black bg-magenta-500 px-6 py-6 text-black"
        style={{
          boxShadow: "6px 6px 0px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider mb-2">Access Exhausted</h2>
            <p className="text-sm font-bold opacity-80">No more free puzzles today</p>
          </div>

          <div className="w-full border-4 border-black bg-white py-4">
            <p className="text-xs font-black uppercase tracking-wider opacity-70 mb-1">Upgrade to Premium</p>
            <p className="text-2xl font-black text-magenta-500">$1/month</p>
            <p className="text-xs font-bold mt-2">• Unlimited puzzles daily</p>
            <p className="text-xs font-bold">• Premium badges</p>
          </div>

          <button
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="w-full border-4 border-black bg-lime-400 text-black px-4 py-3 font-black text-sm uppercase tracking-widest transition-all duration-300"
            style={{
              boxShadow: isHovered ? "6px 6px 0px rgba(0, 0, 0, 0.3)" : "4px 4px 0px rgba(0, 0, 0, 0.2)",
              transform: isHovered ? "translate(-2px, -2px) scale(1.02)" : "translate(0, 0)",
            }}
          >
            Unlock Now
          </button>

          <p className="text-xs font-bold opacity-70">Or come back tomorrow for free puzzles</p>
        </div>
      </div>
      <style jsx>{`
        @keyframes slideUpPaywall {
          from {
            opacity: 0;
            transform: translateY(40px) rotate(-2deg);
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
