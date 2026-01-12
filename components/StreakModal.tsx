"use client";

import { useState, useEffect } from "react";
import { UserStats, StreakData } from "@/lib/types";
import Link from "next/link";

interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  userStats: UserStats | StreakData | null;
}

export function StreakModal({ isOpen, onClose, userStats }: StreakModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userStats) {
      setIsLoading(false);
    }
  }, [isOpen, userStats]);

  const handleClose = () => {
    onClose();
  };

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
      <div className="relative bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] max-w-md w-full max-h-[85vh] transform rotate-1 flex flex-col">
        {/* Fixed header */}
        <div className="bg-purple-400 border-b-4 border-black p-4 shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase tracking-wider text-black">
              🔥 Your Streak
            </h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 bg-red-500 border-2 border-black font-black text-black hover:bg-red-400 transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="p-6 bg-white space-y-6 overflow-y-auto flex-1 min-h-0">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-black border-4 border-purple-400 animate-bounce">
                <div className="w-full h-full bg-purple-400 border-2 border-black animate-pulse"></div>
              </div>
              <p className="font-black text-black uppercase tracking-wide">Loading...</p>
            </div>
          ) : (
            <>
              {/* Streak Summary */}
              <div className="bg-orange-300 border-4 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform -rotate-1">
                <h3 className="font-black text-lg uppercase text-black mb-3">📊 Streak Stats</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">Current Streak:</span>
                    <span className="bg-black text-orange-300 px-3 py-1 font-black text-xl">
                      {userStats?.currentStreak || 0} days
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">Longest Streak:</span>
                    <span className="font-black text-black">
                      {userStats?.longestStreak || 0} days
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">Last Puzzle:</span>
                    <span className="font-black text-black">
                      {formatDate(userStats?.lastPuzzleDate || null)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Subtle footer */}
        <div className="border-t-4 border-black bg-gray-50 px-4 py-3 text-xs text-gray-600 space-y-1 text-center shrink-0">
          <div className="flex justify-center gap-4">
            <Link href="/terms-of-service" className="hover:text-black transition-colors font-bold">
              terms
            </Link>
            <span>·</span>
            <Link href="/privacy-policy" className="hover:text-black transition-colors font-bold">
              privacy
            </Link>
            <span>·</span>
            <a href="https://t.me/+qffqunjhX3c4OGVk" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors font-bold">
              support
            </a>
          </div>
          <p className="text-xs">Not operated by Opera or MiniPay</p>
        </div>
      </div>
    </div>
  );
}
