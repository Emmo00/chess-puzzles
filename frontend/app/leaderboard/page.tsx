"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAccount } from "wagmi";
import type { LeaderboardEntry, LeaderboardResponse } from "@/lib/types/leaderboard";
import { TelegramSupportLink } from "@/components/TelegramSupportLink";
import { BottomNav } from "@/components/BottomNav";
import { LeagueBadge } from "@/components/LeagueBadge";
import { LEAGUES, type League } from "@/lib/leagues";
import { TriangleAlert, Medal, Trophy, Flame, Star } from "lucide-react";
import { apiFetch } from "@/lib/api";

const LEAGUE_TABS: League[] = ["king", "knight", "pawn"];

function defaultLeague(userLeague?: League | null): League {
  return userLeague ?? "pawn";
}

export default function LeaderboardPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [userLeague, setUserLeague] = useState<League | null>(null);
  const [activeLeague, setActiveLeague] = useState<League>("pawn");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [seasonEnd, setSeasonEnd] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const limit = 20;

  const { address, isConnected } = useAccount();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchUserLeague();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, address]);

  useEffect(() => {
    if (!mounted) return;
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, page, address, activeLeague]);

  const fetchUserLeague = async () => {
    if (!address) return;
    try {
      const data = await apiFetch<LeaderboardResponse>("/api/leaderboard", {
        params: { walletAddress: address, limit: "1" },
      });
      const league = defaultLeague(data.userLeague);
      setUserLeague(league);
      setActiveLeague(league);
    } catch {
      // ignore
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        limit: limit.toString(),
        league: activeLeague,
      };

      if (address) {
        params.walletAddress = address;
      }

      const data = await apiFetch<LeaderboardResponse>("/api/leaderboard", { params });
      setLeaderboard(data.leaderboard);
      setTotal(data.total);
      setUserRank(data.userRank || null);
      setSeasonEnd(data.seasonEnd || null);
      setErrorMsg(null);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
      setErrorMsg("Failed to fetch leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return "Anonymous";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getRankDisplay = (rank: number): ReactNode => {
    if (rank === 1) return <Medal className="w-5 h-5 text-yellow-500 fill-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-500 fill-gray-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-700 fill-orange-400" />;
    return `#${rank}`;
  };

  const totalPages = Math.ceil(total / limit);

  if (!mounted) return null;

  return (
    <div className="h-dvh w-full app-paper-bg text-black flex flex-col overflow-hidden">
      <header className="pt-4 px-4 flex justify-between items-center shrink-0 gap-2">
        <div className="px-3 py-2 font-black text-sm border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-purple-400 text-black inline-flex items-center gap-1">
          <Trophy className="w-4 h-4" /> RANKS
        </div>
        {seasonEnd && (
          <div className="text-[10px] font-black uppercase text-black/70 text-right">
            Season resets<br />
            {new Date(seasonEnd).toUTCString().slice(0, 22)}
          </div>
        )}
      </header>

      {/* League tabs */}
      <div className="px-4 pt-3 pb-1 shrink-0 flex gap-2">
        {LEAGUE_TABS.map((league) => {
          const meta = LEAGUES[league];
          const active = activeLeague === league;
          return (
            <button
              key={league}
              type="button"
              onClick={() => {
                setActiveLeague(league);
                setPage(1);
              }}
              className={`flex-1 px-2 py-2 border-4 border-black font-black text-xs uppercase tracking-wide inline-flex items-center justify-center gap-1 transition-all ${
                active
                  ? "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5"
                  : "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] opacity-70"
              }`}
              style={{ background: meta.color }}
            >
              <span aria-hidden="true">{meta.badge}</span>
              {meta.name.split(" ")[0]}
            </button>
          );
        })}
      </div>
      <div className="px-4 pb-2 shrink-0 text-center">
        <span className="font-bold text-[10px] text-black/60 uppercase tracking-wider">
          {activeLeague === "pawn" && "No requirements — everyone starts here"}
          {activeLeague === "knight" && "750 lifetime pts + 7-day streak"}
          {activeLeague === "king" && "1,800 lifetime pts + 14-day streak"}
        </span>
      </div>

      <main className="flex-1 overflow-y-auto flex flex-col items-center px-4 py-2 gap-4">
        {errorMsg && (
          <div className="w-full max-w-md bg-red-400 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 transform -rotate-1 text-left">
            <div className="font-black text-black text-sm uppercase tracking-wide flex items-center gap-2 mb-2">
              <TriangleAlert className="w-5 h-5 shrink-0" /> {errorMsg}
            </div>
            <TelegramSupportLink />
          </div>
        )}

        {isConnected && userRank && (
          <div className="w-full max-w-md bg-cyan-400 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 transform -rotate-1">
            <div className="flex items-center justify-between mb-2">
              <div className="font-black text-lg text-black">YOUR RANK</div>
              <LeagueBadge league={userRank.league} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-black text-cyan-400 px-3 py-2 font-black text-xl">
                  {getRankDisplay(userRank.rank)}
                </div>
                <div>
                  <div className="font-black text-black">{userRank.displayName}</div>
                  <div className="text-sm font-bold text-black/70">{formatAddress(userRank.walletAddress)}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-black inline-flex items-center justify-end gap-1 w-full">
                  {userRank.seasonPoints} <Star className="w-4 h-4" />
                </div>
                <div className="text-sm font-bold text-black/70 inline-flex items-center justify-end gap-1 w-full">
                  <Flame className="w-3 h-3" /> {userRank.currentStreak} · {userRank.rankScore} pts
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-md">
          <div className="bg-purple-400 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="bg-black text-white px-3 py-3 grid grid-cols-[3rem_1fr_5rem_3rem] gap-2 items-center font-black text-[11px] sm:text-sm">
              <span>RANK</span>
              <span>PLAYER</span>
              <span className="text-right">SEASON</span>
              <span className="text-right">SCORE</span>
            </div>

            {loading && (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-2"></div>
                <div className="font-black text-black">LOADING...</div>
              </div>
            )}

            {!loading && leaderboard.length === 0 && (
              <div className="p-8 text-center">
                <div className="font-black text-black text-lg mb-2">NO PLAYERS HERE YET</div>
                <div className="text-sm font-bold text-black/70">Climb into this league to claim a spot!</div>
              </div>
            )}

            {!loading && leaderboard.length > 0 && (
              <div className="divide-y-2 divide-black">
                {leaderboard.map((entry) => {
                  const isCurrentUser = address?.toLowerCase() === entry.walletAddress?.toLowerCase();
                  return (
                    <div
                      key={entry.walletAddress}
                      className={`px-3 py-3 grid grid-cols-[3rem_1fr_5rem_3rem] gap-2 items-center bg-white`}
                      style={isCurrentUser ? { background: "#cffafe" } : undefined}
                    >
                      <span className="font-black text-black">
                        {getRankDisplay(entry.rank)}
                      </span>
                      <div className="min-w-0">
                        <div className="font-black text-black text-sm truncate flex items-center gap-1.5">
                          {entry.displayName}
                          {isCurrentUser && " (YOU)"}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <LeagueBadge league={entry.league} />
                        </div>
                      </div>
                      <span className="text-right font-black text-black">
                        {entry.seasonPoints}
                      </span>
                      <span className="text-right font-bold text-black/70">
                        {entry.rankScore}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
      </main>

      <BottomNav />
    </div>
  );
}
