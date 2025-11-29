"use client"

import { useState } from "react"

interface GameModeCardProps {
  title: string
  subtitle: string
  icon: string
}

export default function GameModeCard({ title, subtitle, icon }: GameModeCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full border-2 border-black bg-white px-4 py-3 flex items-center gap-3 transition-all duration-200 active:scale-95"
      style={{
        boxShadow: isHovered ? "3px 3px 0px rgba(0, 0, 0, 0.2)" : "2px 2px 0px rgba(0, 0, 0, 0.1)",
        transform: isHovered ? "translate(-1px, -1px)" : "translate(0, 0)",
      }}
    >
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 text-left">
        <div className="text-sm font-bold">{title}</div>
        <div className="text-xs text-gray-600">{subtitle}</div>
      </div>
      <span className="text-lg font-bold text-purple-600">→</span>
    </button>
  )
}
