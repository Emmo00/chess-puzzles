"use client";

import Link from "next/link";
import {DollarSign, Castle} from "lucide-react";

interface PuzzlesActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkInAmountDisplay?: string;
  checkInTokenSymbol?: string;
  maxDailyCheckIns?: number;
}

export function PuzzlesActionModal({
  isOpen,
  onClose,
  checkInAmountDisplay,
  checkInTokenSymbol,
  maxDailyCheckIns,
}: PuzzlesActionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 p-4 flex items-center justify-center pointer-events-auto">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      <div className="relative bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] max-w-md w-full transform -rotate-1">
        <div className="bg-cyan-400 border-b-4 border-black p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase tracking-wider text-black">
              ♟ PUZZLES
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-red-500 border-2 border-black font-black text-black hover:bg-red-400 transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)]"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 bg-white space-y-4">
          <Link
            href="/daily-challenge"
            onClick={onClose}
            className="block bg-yellow-300 border-4 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform rotate-1 hover:-translate-y-0.5 hover:-translate-x-0.5 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-lg uppercase text-black">
                  Solve Daily Challenge
                </p>
                <p className="font-bold text-xs uppercase text-black/80 mt-1">
                  First {maxDailyCheckIns || "0"} users earn {checkInAmountDisplay || "0"} {checkInTokenSymbol || "TOKEN"} after solving
                </p>
              </div>
              <DollarSign className="w-16 h-16 text-green-600" />
            </div>
          </Link>

          <Link
            href="/solve-puzzles"
            onClick={onClose}
            className="block bg-lime-300 border-4 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform -rotate-1 hover:-translate-y-0.5 hover:-translate-x-0.5 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-lg uppercase text-black">Solve 5 Puzzles</p>
                <p className="font-bold text-xs uppercase text-black/80 mt-1">
                  Classic mode with points and streak progression
                </p>
              </div>
              <Castle className="w-16 h-16 text-gray-800" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
