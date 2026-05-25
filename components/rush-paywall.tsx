"use client"

export default function RushPaywall() {
  return (
    <div className="w-full max-w-xs flex flex-col gap-4">
      <div className="border-8 border-black bg-black text-white p-8 text-center shadow-[10px_10px_0px_#000000]">
        <p className="font-black text-sm mb-4 bg-yellow-300 text-black inline-block px-2 py-1 border-2 border-black">DAILY ATTEMPT USED</p>
        <p className="font-black text-xl mb-2 uppercase tracking-wider">Come Back Tomorrow</p>
        <p className="text-xs font-mono bg-white text-black inline-block px-2 py-1 border-2 border-black">You can play again tomorrow for free</p>
      </div>
    </div>
  )
}
