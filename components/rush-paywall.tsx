"use client"

export default function RushPaywall() {
  return (
    <div className="w-full max-w-xs flex flex-col gap-4">
      <div className="border-8 border-black bg-black text-white p-8 text-center">
        <p className="font-black text-sm mb-4">DAILY ATTEMPT USED</p>
        <p className="font-black text-xl mb-2">Come Back Tomorrow</p>
        <p className="text-xs font-mono">You can play again tomorrow for free</p>
      </div>
    </div>
  )
}
