"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { LeaderboardEntry, LeaderboardResponse } from "../../lib/services/leaderboard.service";

export default function LeaderboardPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const { address, isConnected } = useAccount();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchLeaderboard();
    }
  }, [mounted, page, address]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (address) {
        params.append("walletAddress", address);
      }

      const response = await fetch(`/api/leaderboard?${params}`);
      if (response.ok) {
        const data: LeaderboardResponse = await response.json();
        setLeaderboard(data.leaderboard);
        setTotal(data.total);
        setUserRank(data.userRank || null);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return "Anonymous";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "bg-yellow-400";
    if (rank === 2) return "bg-gray-300";
    if (rank === 3) return "bg-orange-400";
    return "bg-white";
  };

  const totalPages = Math.ceil(total / limit);

  if (!mounted) return null;

  return (
    <div className="min-h-screen w-full bg-white text-black flex flex-col">
      {/* Header */}
      <header className="pt-4 px-4 flex justify-between items-center shrink-0">
        <Link
          href="/"
          className="bg-black text-white px-2 py-1 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all"
        >
          ← BACK
        </Link>
        <div className="px-4 py-2 font-black text-sm border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-purple-400 text-black">
          🏆 LEADERBOARD
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 py-6 gap-4">
        {/* User's Rank Card (if connected and ranked) */}
        {isConnected && userRank && (
          <div className="w-full max-w-md bg-cyan-400 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 transform -rotate-1">
            <div className="font-black text-lg text-black mb-2">YOUR RANK</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-black text-cyan-400 px-3 py-2 font-black text-xl">
                  {getRankEmoji(userRank.rank)}
                </div>
                <div>
                  <div className="font-black text-black">{userRank.displayName}</div>
                  <div className="text-sm font-bold text-black/70">{formatAddress(userRank.walletAddress)}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-black">{userRank.totalPuzzlesSolved} 🧩</div>
                <div className="text-sm font-bold text-black/70">{userRank.totalPoints} pts</div>
              </div>
            </div>
          </div>
        )}

        {/* Not ranked message */}
        {isConnected && !userRank && !loading && (
          <div className="w-full max-w-md bg-yellow-400 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 text-center">
            <div className="font-black text-lg text-black">NOT RANKED YET</div>
            <div className="text-sm font-bold text-black/70">Solve puzzles to appear on the leaderboard!</div>
          </div>
        )}

        {/* Leaderboard List */}
        <div className="w-full max-w-md">
          <div className="bg-purple-400 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            {/* Header */}
            <div className="bg-black text-white px-4 py-3 grid grid-cols-[3rem_1fr_4rem_4rem] gap-2 items-center font-black text-sm">
              <span>RANK</span>
              <span>PLAYER</span>
              <span className="text-right">PUZZLES</span>
              <span className="text-right">POINTS</span>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-2"></div>
                <div className="font-black text-black">LOADING...</div>
              </div>
            )}

            {/* Empty State */}
            {!loading && leaderboard.length === 0 && (
              <div className="p-8 text-center">
                <div className="font-black text-black text-lg mb-2">NO PLAYERS YET</div>
                <div className="text-sm font-bold text-black/70">Be the first to solve puzzles!</div>
              </div>
            )}

            {/* Leaderboard Entries */}
            {!loading && leaderboard.length > 0 && (
              <div className="divide-y-2 divide-black">
                {leaderboard.map((entry) => {
                  const isCurrentUser = address?.toLowerCase() === entry.walletAddress?.toLowerCase();
                  return (
                    <div
                      key={entry.walletAddress}
                      className={`px-4 py-3 grid grid-cols-[3rem_1fr_4rem_4rem] gap-2 items-center ${
                        isCurrentUser ? "bg-cyan-300" : getRankStyle(entry.rank)
                      }`}
                    >
                      <span className="font-black text-black">
                        {getRankEmoji(entry.rank)}
                      </span>
                      <div className="min-w-0">
                        <div className="font-black text-black text-sm truncate">
                          {entry.displayName}
                          {isCurrentUser && " (YOU)"}
                        </div>
                        <div className="text-xs font-bold text-black/60 truncate">
                          {formatAddress(entry.walletAddress)}
                        </div>
                      </div>
                      <span className="text-right font-black text-black">
                        {entry.totalPuzzlesSolved}
                      </span>
                      <span className="text-right font-bold text-black/70">
                        {entry.totalPoints}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="bg-black text-white px-4 py-2 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← PREV
              </button>
              <div className="bg-white px-4 py-2 font-black text-sm border-2 border-black">
                {page} / {totalPages}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="bg-black text-white px-4 py-2 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                NEXT →
              </button>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="w-full max-w-md bg-green-400 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 transform rotate-1">
          <div className="font-black text-lg text-black mb-2">📊 RANKING SYSTEM</div>
          <div className="space-y-1 text-sm font-bold text-black">
            <div>🧩 Puzzles Solved (Primary)</div>
            <div>⭐ Total Points (Secondary)</div>
            <div className="text-xs text-black/70 mt-2">
              Consistency matters! Solve more puzzles to climb the ranks.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
