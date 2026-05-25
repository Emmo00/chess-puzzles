"use client";

import { useState, useEffect } from "react";
import { UserStats, StreakData } from "@/lib/types";
import { BadgeCheck, ChartArea, Flame, Trophy, X } from "lucide-react";
import Link from "next/link";
import { PaymentModal } from "./PaymentModal";

interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  userStats: UserStats | StreakData | null;
  hasPremiumAccess?: boolean;
  onPaymentSuccess?: () => void;
}

export function StreakModal({
  isOpen,
  onClose,
  userStats,
  hasPremiumAccess = false,
  onPaymentSuccess,
}: StreakModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userStats) {
      setIsLoading(false);
    }
  }, [isOpen, userStats]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleClose = () => {
    onClose();
  };

  const openPayment = () => setShowPaymentModal(true);
  const closePayment = () => setShowPaymentModal(false);

  if (!isOpen) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-50 p-4 flex items-center justify-center pointer-events-auto">
      {/* Neo-brutalist backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={handleClose} />

      {/* Neo-brutalist modal */}
      <div className="relative bg-white border-4 border-black shadow-[10px_10px_0px_#000000] max-w-md w-full max-h-[85vh] transform rotate-1 flex flex-col">
        {/* Fixed header */}
        <div className="bg-purple-400 border-b-4 border-black p-4 shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase tracking-wider text-black flex gap-4">
              <Flame fill="orange" className="w-8 h-8 text-orange-500" /> Your Streak
            </h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 bg-red-500 border-2 border-black text-black hover:bg-red-400 transition-colors shadow-[2px_2px_0px_#000000] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="p-6 bg-white space-y-6 overflow-y-auto flex-1 min-h-0">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-black border-4 border-purple-400 animate-bounce shadow-[4px_4px_0px_#000000]">
                <div className="w-full h-full bg-purple-400 border-2 border-black animate-pulse"></div>
              </div>
              <p className="font-black text-black uppercase tracking-wide">Loading...</p>
            </div>
          ) : (
            <>
              {/* Streak Summary */}
              <div className="bg-orange-300 border-4 border-black p-4 shadow-[6px_6px_0px_#000000] transform -rotate-1">
                <h3 className="font-black text-lg uppercase text-black mb-3 flex gap-1">
                  <ChartArea fill="blue" className="w-6 h-6 text-red-500" /> Streak Stats
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">Current Streak:</span>
                    <span className="bg-black text-orange-300 px-3 py-1 font-black text-xl">
                      {userStats?.currentStreak || 0} {userStats?.currentStreak === 1 ? "day" : "days"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">Longest Streak:</span>
                    <span className="font-black text-black">
                      {userStats?.longestStreak || 0} {userStats?.longestStreak === 1 ? "day" : "days"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">Last Puzzle:</span>
                    <span className="font-black text-black">{formatDate(userStats?.lastPuzzleDate || null)}</span>
                  </div>
                </div>
              </div>

              {/* Points & Puzzles Summary */}
              <div className="bg-cyan-300 border-4 border-black p-4 shadow-[6px_6px_0px_#000000] transform rotate-1">
                <h3 className="font-black text-lg uppercase text-black mb-3 flex gap-2">
                  <Trophy fill="gold" className="w-6 h-6 text-yellow-500" /> Progress
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">Total Points:</span>
                    <span className="bg-black text-cyan-300 px-3 py-1 font-black text-xl">
                      {"totalPoints" in (userStats || {})
                        ? (userStats as UserStats)?.totalPoints || 0
                        : (userStats as StreakData)?.points || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">Puzzles Solved:</span>
                    <span className="font-black text-black">{userStats?.totalPuzzlesSolved || 0}</span>
                  </div>
                </div>
              </div>

              {!hasPremiumAccess ? (
                <div className="bg-amber-100 border-4 border-black p-4 shadow-[6px_6px_0px_#000000] transform -rotate-1">
                  <h3 className="font-black text-lg uppercase text-black mb-3 flex gap-2">
                    ⭐ Go Premium
                  </h3>
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="font-black text-black">✓</span>
                      <span className="font-bold text-black">Unlimited Puzzles</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-black text-black">✓</span>
                      <span className="font-bold text-black">Golden Badge on Leaderboard</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-black text-black">✓</span>
                      <span className="font-bold text-black">More perks coming soon</span>
                    </div>
                  </div>
                  <button
                    onClick={openPayment}
                    className="w-full bg-black text-amber-100 py-3 px-4 font-black text-sm uppercase tracking-wider border-2 border-black hover:bg-gray-800 transition-all shadow-[3px_3px_0px_#000000]"
                  >
                    Unlock Premium
                  </button>
                </div>
              ) : (
                <div className="bg-lime-300 border-4 border-black p-4 shadow-[6px_6px_0px_#000000] transform -rotate-1">
                  <h3 className="font-black text-lg uppercase text-black mb-2 flex gap-2 items-center">
                    <BadgeCheck className="w-5 h-5" /> Premium Active
                  </h3>
                  <p className="font-bold text-black text-sm uppercase tracking-wide">
                    Unlimited puzzles are already unlocked on this wallet.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Subtle footer */}
        <div className="border-t-4 border-black bg-yellow-100 px-4 py-3 text-xs text-black space-y-1 text-center shrink-0">
          <div className="flex justify-center gap-4">
            <Link href="/terms-of-service" className="hover:text-black transition-colors font-bold">
              Terms
            </Link>
            <span>·</span>
            <Link href="/privacy-policy" className="hover:text-black transition-colors font-bold">
              Privacy
            </Link>
            <span>·</span>
            <a
              href="https://t.me/+qffqunjhX3c4OGVk"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black transition-colors font-bold"
            >
              Support
            </a>
          </div>
          <div className="flex justify-center gap-4">
            <Link href="https://x.com/chesspuzzlesxyz" className="hover:text-black transition-colors font-bold">
              Twitter(X)
            </Link>
          </div>
          <p className="text-xs">Not operated by Opera or MiniPay</p>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal 
        isOpen={showPaymentModal} 
        onClose={closePayment} 
        onSuccess={() => {
          onPaymentSuccess?.();
        }} 
      />
    </div>
  );
}
