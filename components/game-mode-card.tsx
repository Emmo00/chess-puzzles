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
      className="w-full border-4 border-black bg-white px-4 py-3 flex items-center gap-3 transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px]"
      style={{
        boxShadow: isHovered ? "6px 6px 0px #000000" : "4px 4px 0px #000000",
        transform: isHovered ? "translate(-2px, -2px)" : "translate(0, 0)",
      }}
    >
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 text-left">
        <div className="text-sm font-black uppercase tracking-wide">{title}</div>
        <div className="text-xs font-bold uppercase tracking-[0.08em] text-black/70">{subtitle}</div>
      </div>
      <span className="text-lg font-black text-black">→</span>
    </button>
  )
}
