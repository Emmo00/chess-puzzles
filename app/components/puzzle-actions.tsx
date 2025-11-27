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

  const actions = [
    { id: "submit", label: "Submit Move", color: "bg-cyan-400" },
    { id: "retry", label: "Retry Puzzle", color: "bg-magenta-500" },
    { id: "next", label: "Next Puzzle", color: "bg-yellow-400" },
  ]

  return (
    <div
      className="flex flex-col gap-3 w-full"
      style={{
        animation: "slideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 300ms forwards",
        opacity: 0,
      }}
    >
      {actions.map((action, idx) => (
        <button
          key={action.id}
          className={`w-full border-4 border-black ${action.color} px-4 py-4 font-black text-sm uppercase tracking-widest text-black transition-all duration-300 hover:shadow-lg`}
          style={{
            boxShadow: "4px 4px 0px rgba(0, 0, 0, 0.2)",
            animationDelay: `${idx * 80}ms`,
          }}
        >
          {action.label}
        </button>
      ))}
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

        button:hover {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.3) !important;
        }
      `}</style>
    </div>
  )
}
