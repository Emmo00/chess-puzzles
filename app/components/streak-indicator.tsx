"use client"

interface StreakIndicatorProps {
  correct: number
  incorrect: number
}

export default function StreakIndicator({ correct, incorrect }: StreakIndicatorProps) {
  return (
    <div className="w-full flex gap-4">
      {/* Correct Block */}
      <div className="flex-1 border-6 border-black bg-lime-400 p-6 font-black text-center">
        <div className="text-3xl mb-2">{correct}</div>
        <div className="text-xs uppercase tracking-wider">Correct</div>
      </div>

      {/* Incorrect Block */}
      <div className="flex-1 border-6 border-black bg-red-400 p-6 font-black text-center">
        <div className="text-3xl mb-2">{incorrect}</div>
        <div className="text-xs uppercase tracking-wider">Incorrect</div>
      </div>
    </div>
  )
}
