"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { BottomNav } from "@/components/BottomNav";
import { WalletConnect } from "@/components/WalletConnect";
import { Identicon } from "@/components/Identicon";
import { LeagueBadge } from "@/components/LeagueBadge";
import { useUserStats } from "@/lib/hooks/useUserStats";
import { useHintBalance } from "@/lib/hooks/useHintBalance";
import { generateDisplayName } from "@/lib/utils/nameGenerator";
import { levelForPoints } from "@/lib/leveling";
import { getLeague, type League } from "@/lib/leagues";
import type { LeaderboardResponse } from "@/lib/services/leaderboard.service";
import { Coins, Flame, Puzzle, Crown, User, Lightbulb, Snowflake } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { userStats } = useUserStats();
  const { hintBalance, streakFreezes } = useHintBalance();
  const [league, setLeague] = useState<League>("pawn");
  const [seasonPoints, setSeasonPoints] = useState(0);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    fetch(`/api/leaderboard?walletAddress=${address}&limit=1`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: LeaderboardResponse | null) => {
        if (cancelled || !data) return;
        const rank = data.userRank;
        if (rank) {
          setLeague(rank.league);
          setSeasonPoints(rank.seasonPoints);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [address]);

  const points = Math.max(0, Math.floor(userStats?.points ?? 0));
  const streak = Math.max(0, Math.floor(userStats?.currentStreak ?? 0));
  const solved = Math.max(0, Math.floor(userStats?.totalPuzzlesSolved ?? 0));
  const longest = Math.max(0, Math.floor(userStats?.longestStreak ?? 0));
  const level = levelForPoints(points);
  const displayName = userStats?.displayName || (address ? generateDisplayName(address) : "Player");

  const stats = [
    { label: "Level", value: level, icon: Crown, accent: "bg-yellow-400" },
    { label: "Points", value: points.toLocaleString("en-US"), icon: Coins, accent: "bg-cyan-400" },
    { label: "Streak", value: streak, icon: Flame, accent: "bg-orange-400" },
    { label: "Solved", value: solved, icon: Puzzle, accent: "bg-lime-400" },
  ];

  return (
    <div className="h-dvh w-full app-paper-bg text-black flex flex-col overflow-hidden">
      <header className="pt-4 px-4 flex justify-between items-center shrink-0 gap-2">
        <div className="px-3 py-2 font-black text-sm border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-purple-400 text-black inline-flex items-center gap-1">
          <User className="w-4 h-4" /> PROFILE
        </div>
        <WalletConnect />
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 max-w-md w-full mx-auto space-y-5">
        {!isConnected ? (
          <div className="bg-yellow-300 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 text-center">
            <div className="font-black text-lg uppercase">Connect your wallet</div>
            <div className="text-sm font-bold text-black/70 mt-1">to view your profile</div>
          </div>
        ) : (
          <>
            <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 flex flex-col items-center gap-3">
              <div className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Identicon address={address ?? "0x0"} size={96} />
              </div>
              <div className="text-center">
                <div className="font-black text-xl">{displayName}</div>
                <div className="text-xs font-bold text-black/60">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </div>
              </div>
              <LeagueBadge league={league} size="md" />
              <div className="text-[11px] font-bold uppercase text-black/60">
                Season points: {seasonPoints}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className={`${stat.accent} border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" strokeWidth={3} />
                      <span className="text-[10px] font-black uppercase tracking-wide">{stat.label}</span>
                    </div>
                    <div className="font-black text-2xl mt-1">{stat.value}</div>
                  </div>
                );
              })}
            </div>

            <div className="bg-cyan-100 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 text-xs font-bold">
              <div className="font-black uppercase mb-1">Best streak: {longest} days</div>
            </div>

            {/* Inventory */}
            <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4">
              <div className="font-black text-sm uppercase mb-3">Inventory</div>
              <div className="flex gap-3">
                <div className="flex-1 bg-yellow-100 border-2 border-black p-3 text-center">
                  <Lightbulb className="w-5 h-5 mx-auto mb-1" strokeWidth={2.5} />
                  <div className="font-black text-lg">{hintBalance}</div>
                  <div className="text-[10px] font-bold uppercase">Hints</div>
                  {hintBalance <= 0 && (
                    <Link
                      href="/store"
                      className="mt-2 inline-block bg-black text-yellow-400 px-3 py-1 text-xs font-black uppercase border-2 border-black"
                    >
                      Buy
                    </Link>
                  )}
                </div>
                <div className="flex-1 bg-blue-100 border-2 border-black p-3 text-center">
                  <Snowflake className="w-5 h-5 mx-auto mb-1" strokeWidth={2.5} />
                  <div className="font-black text-lg">{streakFreezes}</div>
                  <div className="text-[10px] font-bold uppercase">Freezes</div>
                  {streakFreezes <= 0 && (
                    <Link
                      href="/store"
                      className="mt-2 inline-block bg-black text-blue-300 px-3 py-1 text-xs font-black uppercase border-2 border-black"
                    >
                      Buy
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
