"use client"

import { useState, useEffect } from "react"

interface RushActionsProps {
  onStart: () => void
}

export default function RushActions({ onStart }: RushActionsProps) {
  return (
    <div className="flex gap-3 w-full">
      <button
        onClick={onStart}
        className="flex-1 px-4 py-4 bg-cyan-400 text-black font-black border-4 border-black text-sm uppercase tracking-wider transition-all duration-150 shadow-[6px_6px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]"
      >
        START ROUND
      </button>
    </div>
  )
}
