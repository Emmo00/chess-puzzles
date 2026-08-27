"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { Snowflake, Flame, X, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface StreakEventData {
  type: "freeze_used" | "streak_lost";
  day: number;
  currentStreak: number;
}

export function StreakNotification() {
  const { address, isConnected } = useAccount();
  const [event, setEvent] = useState<StreakEventData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const acknowledge = useCallback(async () => {
    if (!address) return;
    try {
      await apiFetch("/api/users/streak/event", {
        method: "POST",
        headers: {
          "x-wallet-address": address,
          Authorization: `Bearer ${address}`,
        },
      });
    } catch {
      // ignore
    }
  }, [address]);

  useEffect(() => {
    if (!isConnected || !address || dismissed) return;
    let cancelled = false;
    apiFetch<{ event: StreakEventData }>("/api/users/streak/event", {
      headers: {
        "x-wallet-address": address,
        Authorization: `Bearer ${address}`,
      },
    })
      .then((data) => {
        if (cancelled || !data?.event) return;
        setEvent(data.event);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [address, isConnected, dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    setEvent(null);
    acknowledge();
  };

  if (!event) return null;

  if (event.type === "freeze_used") {
    return (
      <div className="fixed inset-0 z-50 p-4 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/80" onClick={handleDismiss} />
        <div className="relative bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] max-w-sm w-full">
          <div className="bg-blue-400 border-b-4 border-black p-4 flex justify-between items-center">
            <h2 className="font-black text-lg uppercase text-black inline-flex items-center gap-2">
              <Snowflake className="w-6 h-6" /> Streak Freeze Used
            </h2>
            <button
              onClick={handleDismiss}
              className="w-7 h-7 bg-red-500 border-2 border-black text-black flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-5 space-y-3">
            <p className="font-bold text-sm text-black">
              You missed yesterday&apos;s Daily Challenge, but one of your Streak Freezes was automatically used to protect your{" "}
              <span className="font-black text-blue-600">{event.currentStreak}-day streak</span>.
            </p>
            <div className="bg-blue-100 border-2 border-black p-3 flex items-center gap-2">
              <Snowflake className="w-5 h-5 shrink-0 text-blue-600" />
              <span className="text-xs font-bold text-black">
                Your streak is safe. Streak Freezes are automatically consumed when you miss a day.
              </span>
            </div>
            <button
              onClick={handleDismiss}
              className="w-full bg-black text-white py-3 font-black text-sm uppercase tracking-wide border-2 border-black hover:bg-gray-800 transition-all"
            >
              Got It
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (event.type === "streak_lost") {
    return (
      <div className="fixed inset-0 z-50 p-4 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/80" onClick={handleDismiss} />
        <div className="relative bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] max-w-sm w-full">
          <div className="bg-red-400 border-b-4 border-black p-4 flex justify-between items-center">
            <h2 className="font-black text-lg uppercase text-black inline-flex items-center gap-2">
              <Flame className="w-6 h-6" /> Streak Ended
            </h2>
            <button
              onClick={handleDismiss}
              className="w-7 h-7 bg-red-500 border-2 border-black text-black flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-5 space-y-3">
            <p className="font-bold text-sm text-black">
              You missed yesterday&apos;s Daily Challenge and didn&apos;t have a Streak Freeze available.
            </p>
            <p className="text-xs font-bold text-black/70">
              Buy a Streak Freeze so you&apos;re protected the next time life gets in the way.
            </p>
            <div className="flex gap-2">
              <Link
                href="/store"
                onClick={handleDismiss}
                className="flex-1 bg-black text-white py-3 font-black text-sm uppercase tracking-wide border-2 border-black hover:bg-gray-800 transition-all inline-flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" /> Buy Streak Freeze
              </Link>
              <button
                onClick={handleDismiss}
                className="bg-white text-black px-4 py-3 font-black text-xs uppercase border-2 border-black hover:bg-gray-100 transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
