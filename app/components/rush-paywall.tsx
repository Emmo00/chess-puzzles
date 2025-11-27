"use client"

export default function RushPaywall() {
  return (
    <div className="w-full max-w-xs flex flex-col gap-4">
      <div className="border-8 border-black bg-black text-white p-8 text-center">
        <p className="font-black text-sm mb-4">DAILY ATTEMPT USED</p>
        <p className="font-black text-xl mb-2">Get Unlimited Rush</p>
        <p className="text-xs font-mono">Premium users get unlimited rounds daily</p>
      </div>

      <button
        className="w-full px-6 py-4 text-black font-black border-6 border-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform"
        style={{
          background: "linear-gradient(135deg, #06B6D4, #EC4899, #FBBF24)",
          boxShadow: "0 0 20px rgba(236, 72, 153, 0.5), 6px 6px 0px rgba(0, 0, 0, 0.2)",
        }}
      >
        UPGRADE TO PREMIUM
      </button>
    </div>
  )
}
