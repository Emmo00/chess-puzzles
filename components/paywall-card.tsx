"use client"

import { useEffect, useState } from "react"
import { PaymentModal } from "./PaymentModal"

export default function PaywallCard() {
  const [mounted, setMounted] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

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
        className="border-4 border-black bg-magenta-500 px-6 py-6 text-black shadow-[10px_10px_0px_#000000]"
        style={{
          boxShadow: "10px 10px 0px #000000",
        }}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider mb-2">Payment Required</h2>
            <p className="text-sm font-bold opacity-80">Purchase access to solve puzzles</p>
          </div>

          <div className="w-full border-4 border-black bg-white py-4 shadow-[4px_4px_0px_#000000]">
            <p className="text-xs font-black uppercase tracking-wider opacity-70 mb-1">Get Access</p>
            <div className="space-y-2">
              <div className="border-2 border-black p-2 bg-cyan-300">
                <p className="text-lg font-black text-cyan-600">Daily Pass - $0.10</p>
                <p className="text-xs font-bold">3 puzzles today</p>
                </div>
                <div className="border-2 border-black p-2 bg-amber-100 mt-2">
                  <p className="text-lg font-black text-amber-600">Go Premium</p>
                  <p className="text-xs font-bold">Unlimited puzzles · $2/mo or $20/yr · Golden leaderboard badge</p>
                </div>
            </div>
          </div>

          <button
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => setShowPaymentModal(true)}
            className="w-full border-4 border-black bg-lime-400 text-black px-4 py-3 font-black text-sm uppercase tracking-widest transition-all duration-150"
            style={{
              boxShadow: isHovered ? "8px 8px 0px #000000" : "5px 5px 0px #000000",
              transform: isHovered ? "translate(-2px, -2px)" : "translate(0, 0)",
            }}
          >
            Unlock Now
          </button>

          <p className="text-xs font-bold opacity-70">Or come back tomorrow for free puzzles</p>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          // Let the payment modal own its success state; keep this paywall open
          // until the user closes the payment modal themselves.
        }}
      />

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
