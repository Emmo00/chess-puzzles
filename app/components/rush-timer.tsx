"use client"

import { useEffect, useState } from "react"

interface RushTimerProps {
  timeRemaining: number
}

export default function RushTimer({ timeRemaining }: RushTimerProps) {
  const [jitter, setJitter] = useState(false)

  useEffect(() => {
    if (timeRemaining < 10) {
      const interval = setInterval(() => {
        setJitter((prev) => !prev)
      }, 100)
      return () => clearInterval(interval)
    }
  }, [timeRemaining])

  const displayTime = String(timeRemaining).padStart(2, "0")

  return (
    <div
      className="border-8 border-black p-8 bg-white font-black text-6xl tracking-wider text-center w-full transition-transform duration-100"
      style={{
        boxShadow: "6px 6px 0px rgba(0, 0, 0, 0.2)",
        transform: jitter ? `translate(${Math.random() * 4 - 2}px, ${Math.random() * 4 - 2}px)` : "translate(0, 0)",
      }}
    >
      {displayTime}s
    </div>
  )
}
