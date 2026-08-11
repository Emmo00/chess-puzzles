"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  AlertTriangle,
  Clock,
  Flame,
  Gauge,
  Loader2,
  Medal,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useAccount, usePublicClient } from "wagmi";

import ChessBoard, { ChessBoardRef } from "@/components/chess-board";
import { WalletConnect } from "@/components/WalletConnect";
import { BottomNav } from "@/components/BottomNav";
import { SiteFooter } from "@/components/SiteFooter";
import { TelegramSupportLink } from "@/components/TelegramSupportLink";
import { PaymentModal } from "@/components/PaymentModal";
import {
  usePuzzleRush,
  PuzzleRushActivePayload,
  PuzzleRushCompletedPayload,
  PuzzleRushActiveState,
  PuzzleRushLeaderboardEntry,
  PuzzleRushLeaderboardResponse,
} from "@/lib/hooks/usePuzzleRush";
import { puzzleQueue } from "@/lib/puzzle-rush/puzzleQueue";
import { resultQueue } from "@/lib/puzzle-rush/resultQueue";
import type { PuzzleRushMode } from "@/lib/config/puzzleRush";
import { GAME_ASSETS_CONTRACT } from "@/lib/config/wagmi";
import { GAME_ASSETS_ABI } from "@/lib/abi/gameAssets";
import { toast } from "sonner";

type BoardKey = number;

type RushTab = "start" | "leaderboard";

const LEADERBOARD_PAGE_SIZE = 50;
const PERIODS = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
] as const;

const MODE_META: Record<
  PuzzleRushMode,
  { label: string; sub: string; color: string; icon: typeof Gauge }
> = {
  "3m": { label: "3 Minutes", sub: "Score in 3 minutes", color: "bg-cyan-400", icon: Clock },
  "5m": { label: "5 Minutes", sub: "Score in 5 minutes", color: "bg-blue-400", icon: Clock },
  survival: { label: "Survival", sub: "Endless, strikes end the run", color: "bg-orange-400", icon: Flame },
};

function secondsUntil(deadlineMs: number | null): number | null {
  if (deadlineMs === null) return null;
  const diff = Math.floor((deadlineMs - Date.now()) / 1000);
  return Math.max(diff, 0);
}

export default function PuzzleRushPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedMode, setSelectedMode] = useState<PuzzleRushMode>("3m");
  const [active, setActive] = useState<PuzzleRushActivePayload | null>(null);
  const [results, setResults] = useState<PuzzleRushCompletedPayload | null>(null);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [highlightedSquares, setHighlightedSquares] = useState<{ from?: string; to?: string } | null>(null);
  const [boardKey, setBoardKey] = useState(0);
  const [showFreeUsedModal, setShowFreeUsedModal] = useState(false);
  const [dailyPassPrice, setDailyPassPrice] = useState<string | null>(null);
  const [tab, setTab] = useState<RushTab>("start");
  const [lbPeriod, setLbPeriod] = useState<(typeof PERIODS)[number]["id"]>("all");
  const [lbEntries, setLbEntries] = useState<PuzzleRushLeaderboardEntry[]>([]);
  const [lbTotal, setLbTotal] = useState(0);
  const [lbHasMore, setLbHasMore] = useState(false);
  const [lbUserRank, setLbUserRank] = useState<PuzzleRushLeaderboardEntry | null>(null);
  const [lbLoading, setLbLoading] = useState(false);
  const [lbLoadingMore, setLbLoadingMore] = useState(false);
  const [lbError, setLbError] = useState<string | null>(null);

  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  const {
    status,
    loading,
    error,
    refreshStatus,
    startSession,
    reportResult,
    fetchPuzzlesBatch,
    endSession,
    fetchLeaderboard,
  } = usePuzzleRush();

  const boardRef = useRef<ChessBoardRef>(null);
  const activeRef = useRef<PuzzleRushActivePayload | null>(null);
  const puzzleStartRef = useRef<number>(Date.now());
  const lbScrollRef = useRef<HTMLDivElement | null>(null);
  const lbLoadingMutRef = useRef(false);

  activeRef.current = active;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Daily Pass price once so the "used free session" purchase modal can
  // show the price immediately.
  useEffect(() => {
    if (!GAME_ASSETS_CONTRACT || !publicClient) return;
    publicClient
      .readContract({
        address: GAME_ASSETS_CONTRACT,
        abi: GAME_ASSETS_ABI,
        functionName: "dailyPassPrice",
      })
      .then((price) => setDailyPassPrice((Number(price) / 1_000_000).toFixed(2)))
      .catch(() => setDailyPassPrice(null));
  }, [publicClient]);

  const config = status?.config;
  const entitlement = status?.entitlement;

  // Countdown timer for timed modes
  useEffect(() => {
    if (!active || active.mode === "survival") {
      setTimeLeft(null);
      return;
    }
    const tick = () => {
      const left = secondsUntil(active.deadlineMs);
      if (left === null) return;
      setTimeLeft(left);
      if (left <= 0) {
        // Timer expired — finalize the session
        void finishSession(active.sessionId);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const fireConfetti = () => {
    confetti({ particleCount: 90, spread: 70, startVelocity: 45, origin: { y: 0.7 } });
  };

  const startRun = async (mode: PuzzleRushMode) => {
    const payload = await startSession(mode);

    // Configure the local puzzle queues for this session; batch fetching is
    // done in the background so the next puzzle is always available instantly.
    puzzleQueue.configure(payload.sessionId, (moves, count) =>
      fetchPuzzlesBatch(payload.sessionId, moves, count)
    );
    await puzzleQueue.preload();

    resultQueue.configure({
      sessionId: payload.sessionId,
      stepIndex: 0,
      submitFn: (item) => reportResult(item),
      onState: (state: PuzzleRushActiveState) =>
        setActive((prev) => (prev ? { ...prev, state } : prev)),
      onCompleted: (response) => handleCompleted(response),
      onEnded: () =>
        void finishSession(activeRef.current?.sessionId ?? payload.sessionId),
    });

    let first = puzzleQueue.dequeue();
    if (!first) {
      try {
        first = await puzzleQueue.waitForPuzzle();
      } catch {
        await finishSession(payload.sessionId);
        return;
      }
    }

    setTab("start");
    setActive({ ...payload, puzzle: first });
    setBoardKey((k) => k + 1);
    setHighlightedSquares(null);
    puzzleStartRef.current = Date.now();
  };

  const handleStart = async () => {
    if (!isConnected) {
      toast.error("Connect your wallet to play Puzzle Rush.");
      return;
    }
    setStarting(true);
    setResults(null);
    try {
      await startRun(selectedMode);
    } catch (err: any) {
      if (err?.code === "FREE_SESSION_USED") {
        setShowFreeUsedModal(true);
      } else {
        toast.error(err?.message || "Could not start session");
      }
    } finally {
      setStarting(false);
    }
  };

  const handleFreeUsedSuccess = () => {
    setShowFreeUsedModal(false);
    void refreshStatus();
    toast.success("Daily Pass purchased! Starting Puzzle Rush...");
    setStarting(true);
    void startRun(selectedMode)
      .catch((err: any) => {
        toast.error(err?.message || "Could not start session");
      })
      .finally(() => setStarting(false));
  };

  const loadLeaderboard = useCallback(
    async (period: (typeof PERIODS)[number]["id"], offset = 0, append = false) => {
      if (append && lbLoadingMutRef.current) return;
      lbLoadingMutRef.current = true;
      append ? setLbLoadingMore(true) : setLbLoading(true);
      setLbError(null);
      try {
        const res = await fetchLeaderboard(period, LEADERBOARD_PAGE_SIZE, offset);
        if (append) {
          setLbEntries((prev) => {
            const seen = new Set(prev.map((e) => e.walletAddress));
            const fresh = res.leaderboard.filter((e) => !seen.has(e.walletAddress));
            return [...prev, ...fresh];
          });
        } else {
          setLbEntries(res.leaderboard);
        }
        setLbTotal(res.total);
        setLbHasMore(res.hasMore);
        setLbUserRank(res.userRank);
      } catch (e: any) {
        setLbError(e?.message || "Failed to load leaderboard");
      } finally {
        lbLoadingMutRef.current = false;
        append ? setLbLoadingMore(false) : setLbLoading(false);
      }
    },
    [fetchLeaderboard]
  );

  // Load leaderboard when the tab becomes active or the period changes.
  useEffect(() => {
    if (tab !== "leaderboard") return;
    setLbEntries([]);
    void loadLeaderboard(lbPeriod, 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, lbPeriod, loadLeaderboard]);

  const handleLeaderboardScroll = useCallback(() => {
    const el = lbScrollRef.current;
    if (!el) return;
    if (lbLoadingMutRef.current || !lbHasMore) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 300;
    if (nearBottom) {
      void loadLeaderboard(lbPeriod, lbEntries.length, true);
    }
  }, [lbHasMore, lbPeriod, lbEntries.length, loadLeaderboard]);

  const formatAddress = (addr: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "Anonymous";

  const submitAndAdvance = async (solved: boolean) => {
    const current = activeRef.current;
    if (!current) return;
    if (resultQueue.isEnded()) return;

    const solvedMs = Date.now() - puzzleStartRef.current;

    const puzzle = current.puzzle;
    if (!puzzle) return;

    // Submit the result asynchronously (ordered + retried by the result queue).
    resultQueue.enqueue({
      puzzleId: puzzle.puzzleid,
      solved,
      solveTimeSec: Math.floor(solvedMs / 1000),
    });

    // Advance the board instantly from the local queue — no network wait.
    let next = puzzleQueue.dequeue();
    if (!next) {
      try {
        next = await puzzleQueue.waitForPuzzle();
      } catch {
        toast.error("Could not load the next puzzle");
        return;
      }
    }
    if (!next) return;

    setBoardKey((k) => k + 1);
    setActive((prev) => (prev ? { ...prev, puzzle: next } : prev));
    setHighlightedSquares(null);
    puzzleStartRef.current = Date.now();
  };

  const handlePuzzleComplete = () => {
    void submitAndAdvance(true);
  };

  const handleWrongMove = () => {
    void submitAndAdvance(false);
  };

  const handleCompleted = (response: PuzzleRushCompletedPayload) => {
    setResults(response);
    setActive(null);
    if (response.results.strikes < (config?.access.strikesToEnd ?? 3)) {
      fireConfetti();
    }
    void refreshStatus();
  };

  const finishSession = useCallback(
    async (sessionId: string) => {
      try {
        const payload = await endSession(sessionId);
        setResults(payload);
        setActive(null);
        void refreshStatus();
      } catch {
        toast.error("Failed to finalize session");
      }
    },
    [endSession, refreshStatus]
  );

  const handleEndEarly = async () => {
    const current = activeRef.current;
    if (!current) return;
    setSubmitting(true);
    await finishSession(current.sessionId);
    setSubmitting(false);
  };

  const modeConfig = useMemo(() => {
    if (!config) return null;
    return {
      strikesToEnd: config.access.strikesToEnd,
      durations: config.access.modeDurationsSec,
    };
  }, [config]);

  if (!mounted) return null;

  // Results view
  if (results) {
    const r = results.results;
    const rankDelta = r.rankDelta;
    const rankChanged = rankDelta !== null && rankDelta !== undefined;
    return (
      <div className="h-dvh w-full app-paper-bg text-black flex flex-col overflow-hidden">
        <header className="pt-4 px-4 flex justify-between items-center shrink-0">
          <Link href="/puzzle-rush" className="bg-black text-white px-2 py-1 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            ← HOME
          </Link>
          <div className="px-4 py-2 font-black text-sm border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-lime-400 text-black inline-flex items-center gap-1">
            <Gauge className="w-4 h-4" /> PUZZLE RUSH
          </div>
        </header>
        <RushTabBar tab={tab} onTabChange={setTab} />
        {tab === "leaderboard" ? (
          <LeaderboardPanel
            period={lbPeriod}
            onPeriodChange={setLbPeriod}
            entries={lbEntries}
            loading={lbLoading}
            loadingMore={lbLoadingMore}
            hasMore={lbHasMore}
            total={lbTotal}
            userRank={lbUserRank}
            error={lbError}
            address={address}
            scrollRef={lbScrollRef}
            onScroll={handleLeaderboardScroll}
            formatAddress={formatAddress}
          />
        ) : (
        <main className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-4 py-6 gap-4">
          <div className="w-full max-w-sm bg-lime-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform -rotate-1 text-center">
            <h1 className="text-2xl font-black uppercase text-black mb-1">Run Over</h1>
            <p className="text-xs font-black uppercase text-black/70">
              {MODE_META[results.mode].label}
            </p>
            <div className="mt-4 bg-black text-lime-300 px-6 py-4 font-black text-5xl inline-block border-2 border-black">
              {r.score}
            </div>
            <div className="mt-2 text-sm font-bold uppercase text-black">
              {r.puzzlesSolved} solved · {r.puzzlesAttempted} attempted
            </div>
          </div>

          <div className="w-full max-w-sm grid grid-cols-2 gap-2">
            <StatBox label="Longest Streak" value={`${r.longestStreak}`} icon={<Flame className="w-4 h-4" />} color="bg-orange-400" />
            <StatBox label="Highest Rating" value={`${r.highestDifficultySolved}`} icon={<Target className="w-4 h-4" />} color="bg-purple-400" />
            <StatBox label="Avg Solve Time" value={`${r.averageTimePerPuzzleSec}s`} icon={<Clock className="w-4 h-4" />} color="bg-cyan-400" />
            <StatBox label="Duration" value={`${r.durationSec}s`} icon={<Clock className="w-4 h-4" />} color="bg-blue-400" />
          </div>

          {r.finalRank !== null && (
            <div className="w-full max-w-sm bg-yellow-300 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black uppercase">
                <Medal className="w-5 h-5" /> Rank #{r.finalRank}
              </div>
              {rankChanged && (
                <div className={`inline-flex items-center gap-1 font-black text-sm ${rankDelta! > 0 ? "text-green-700" : "text-red-600"}`}>
                  {rankDelta! >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {rankDelta! > 0 ? `+${rankDelta}` : rankDelta}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 w-full max-w-sm">
            <button
              onClick={() => { setResults(null); void handleStart(); }}
              className="flex-1 bg-black text-white py-3 px-4 font-black text-sm uppercase border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            >
              PLAY AGAIN
            </button>
            <button
              onClick={() => { setResults(null); setTab("leaderboard"); }}
              className="flex-1 bg-purple-400 text-black py-3 px-4 font-black text-sm uppercase border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-center"
            >
              <Trophy className="w-4 h-4 inline mr-1" /> RANKS
            </button>
          </div>
        </main>
        )}
        <BottomNav />
      </div>
    );
  }

  // Lobby (no active session)
  if (!active) {
    return (
      <div className="h-dvh w-full app-paper-bg text-black flex flex-col overflow-hidden">
        <header className="pt-4 px-4 flex justify-between items-center shrink-0 gap-2">
          <Link href="/" className="bg-black text-white px-2 py-1 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            ← BACK
          </Link>
          <div className="px-4 py-2 font-black text-sm border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-lime-400 text-black inline-flex items-center gap-1">
            <Gauge className="w-4 h-4" /> PUZZLE RUSH
          </div>
          <WalletConnect />
        </header>

        <RushTabBar tab={tab} onTabChange={setTab} />

        {tab === "leaderboard" ? (
          <LeaderboardPanel
            period={lbPeriod}
            onPeriodChange={setLbPeriod}
            entries={lbEntries}
            loading={lbLoading}
            loadingMore={lbLoadingMore}
            hasMore={lbHasMore}
            total={lbTotal}
            userRank={lbUserRank}
            error={lbError}
            address={address}
            scrollRef={lbScrollRef}
            onScroll={handleLeaderboardScroll}
            formatAddress={formatAddress}
          />
        ) : (
        <main className="flex-1 overflow-y-auto flex flex-col items-center px-4 py-4 gap-4 max-w-md w-full mx-auto">
          {!isConnected ? (
            <div className="w-full max-w-xs text-center bg-cyan-300 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] p-6 transform -rotate-1">
              <h1 className="text-xl font-black uppercase text-black mb-2">Connect Wallet</h1>
              <p className="text-sm font-bold text-black mb-4">
                Connect to play Puzzle Rush and climb the leaderboard.
              </p>
              <div className="flex justify-center">
                <WalletConnect />
              </div>
            </div>
          ) : loading ? (
            <div className="w-full max-w-xs bg-yellow-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              <p className="text-sm font-black text-black mt-2 uppercase">Loading...</p>
            </div>
          ) : error ? (
            <div className="w-full max-w-xs bg-red-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-5 transform -rotate-1">
              <div className="font-black text-sm uppercase text-black flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" /> {error}
              </div>
              <TelegramSupportLink />
            </div>
          ) : (
            <>
              {/* Mode selection */}
              <div className="w-full space-y-3">
                <h2 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                  <span className="inline-block w-2 h-4 bg-black" /> Choose a mode
                </h2>
                {(Object.keys(MODE_META) as PuzzleRushMode[]).map((mode) => {
                  const meta = MODE_META[mode];
                  const Icon = meta.icon;
                  const active = selectedMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSelectedMode(mode)}
                      className={`w-full p-3 border-4 border-black flex items-center gap-3 text-left transition-all ${
                        active
                          ? "shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] scale-[1.01]"
                          : "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] opacity-80"
                      } ${meta.color}`}
                    >
                      <span className="grid place-items-center w-10 h-10 border-2 border-black bg-white shrink-0">
                        <Icon className="w-5 h-5" strokeWidth={3} />
                      </span>
                      <span className="flex-1">
                        <span className="block font-black text-sm uppercase">{meta.label}</span>
                        <span className="block text-xs font-bold text-black/70">{meta.sub}</span>
                      </span>
                      {mode !== "survival" && modeConfig && (
                        <span className="text-xs font-black uppercase bg-black text-white px-2 py-1">
                          {Math.floor(modeConfig.durations[mode] / 60)}m
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleStart}
                disabled={starting}
                className="w-full bg-green-400 text-black py-4 px-6 font-black text-lg border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0"
              >
                {starting ? "STARTING..." : "START PUZZLE RUSH"}
              </button>

              {entitlement && entitlement.user && entitlement.user.currentRank !== null && (
                <div className="w-full bg-purple-300 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-3 flex items-center justify-between">
                  <span className="font-black text-sm uppercase inline-flex items-center gap-1">
                    <Trophy className="w-4 h-4" /> Your rank
                  </span>
                  <span className="font-black text-sm">#{entitlement.user.currentRank} · {entitlement.user.bestScore} pts</span>
                </div>
              )}
            </>
          )}
        </main>
        )}

        <BottomNav />

        {dailyPassPrice && (
          <PaymentModal
            isOpen={showFreeUsedModal}
            onClose={() => setShowFreeUsedModal(false)}
            onSuccess={handleFreeUsedSuccess}
            defaultPriceUsd={dailyPassPrice}
          />
        )}
      </div>
    );
  }

  // Active game
  const meta = MODE_META[active.mode];
  return (
    <div className="h-dvh w-full app-paper-bg text-black flex flex-col overflow-hidden">
      <header className="pt-4 px-4 flex justify-between items-center shrink-0">
        <button
          onClick={handleEndEarly}
          disabled={submitting}
          className="bg-black text-white px-3 py-2 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
        >
          END RUN
        </button>
        <div className="px-3 py-2 font-black text-sm border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-lime-400 text-black">
          {meta.label.toUpperCase()}
        </div>
        <div className="font-black text-2xl text-black min-w-[4rem] text-right">
          {active.state.score}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto flex flex-col items-center px-4 py-4 gap-3 min-h-0">
        {/* HUD — keep strikes prominent, timer subtle */}
        <div className="w-full max-w-[560px] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-black text-white px-3 py-1.5 font-black text-sm uppercase border-2 border-black">
              Strikes <span className="text-red-400">{active.state.strikes}/{modeConfig?.strikesToEnd ?? 3}</span>
            </span>
          </div>
          {active.mode !== "survival" && timeLeft !== null && (
            <span className="font-bold text-xs uppercase text-black/50">
              <Clock className="w-3.5 h-3.5 inline mr-1" />{timeLeft}s
            </span>
          )}
        </div>

        {/* Board */}
        <div className="w-full max-w-[560px] aspect-square flex-1 min-h-0">
          <ChessBoard
            key={boardKey}
            ref={boardRef}
            puzzle={active.puzzle ?? undefined}
            onComplete={handlePuzzleComplete}
            onWrongMove={handleWrongMove}
            highlightedSquares={highlightedSquares}
            onProgress={() => setHighlightedSquares(null)}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function StatBox({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`${color} border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3`}>
      <div className="font-black text-xs uppercase flex items-center gap-1 text-black/70">
        {icon} {label}
      </div>
      <div className="font-black text-xl text-black mt-1">{value}</div>
    </div>
  );
}

function RushTabBar({
  tab,
  onTabChange,
}: {
  tab: RushTab;
  onTabChange: (tab: RushTab) => void;
}) {
  const tabs: { id: RushTab; label: string }[] = [
    { id: "start", label: "PUZZLE RUSH" },
    { id: "leaderboard", label: "LEADERBOARD" },
  ];
  return (
    <div className="px-4 pt-3 pb-1 shrink-0 flex gap-2 max-w-md w-full mx-auto">
      {tabs.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={`flex-1 px-3 py-2 border-4 border-black font-black text-xs uppercase tracking-wide transition-all ${
              active
                ? "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5 bg-lime-300"
                : "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] opacity-70 bg-white"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function LeaderboardPanel({
  period,
  onPeriodChange,
  entries,
  loading,
  loadingMore,
  hasMore,
  total,
  userRank,
  error,
  address,
  scrollRef,
  onScroll,
  formatAddress,
}: {
  period: (typeof PERIODS)[number]["id"];
  onPeriodChange: (period: (typeof PERIODS)[number]["id"]) => void;
  entries: PuzzleRushLeaderboardEntry[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  total: number;
  userRank: PuzzleRushLeaderboardEntry | null;
  error: string | null;
  address?: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  formatAddress: (a: string) => string;
}) {
  return (
    <main
      ref={scrollRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto flex flex-col items-center px-4 py-2 gap-4"
    >
      {/* Period filters */}
      <div className="w-full max-w-md flex gap-2">
        {PERIODS.map((p) => {
          const active = period === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPeriodChange(p.id)}
              className={`px-3 py-1 border-2 border-black font-black text-[10px] uppercase tracking-wide transition-all ${
                active ? "bg-black text-white" : "bg-white text-black opacity-70"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="w-full max-w-md bg-yellow-300 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 text-xs font-black uppercase text-center">
        Best Puzzle Rush players
      </div>

      {error && (
        <div className="w-full max-w-md bg-red-400 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 text-left">
          <div className="font-black text-sm uppercase text-black">{error}</div>
        </div>
      )}

      {!loading && userRank && (
        <div className="w-full max-w-md bg-cyan-400 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 flex items-center justify-between transform -rotate-1">
          <div className="flex items-center gap-3">
            <div className="bg-black text-cyan-400 px-3 py-2 font-black text-xl">
              #{userRank.rank}
            </div>
            <div>
              <div className="font-black text-black">YOU</div>
              <div className="font-bold text-xs text-black/70">{formatAddress(userRank.walletAddress)}</div>
            </div>
          </div>
          <div className="font-black text-black text-xl">{userRank.bestScore}</div>
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="bg-purple-400 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="bg-black text-white px-3 py-3 grid grid-cols-[3rem_1fr_6rem] gap-2 items-center font-black text-[11px] sm:text-sm">
            <span>RANK</span>
            <span>PLAYER</span>
            <span className="text-right">SCORE</span>
          </div>

          {loading && (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              <div className="font-black text-black mt-2 uppercase">Loading...</div>
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div className="p-8 text-center">
              <div className="font-black text-black text-lg uppercase mb-1">
                <Gauge className="w-5 h-5 inline mr-1" /> No scores yet
              </div>
              <div className="text-sm font-bold text-black/70">Play Puzzle Rush to claim a spot!</div>
            </div>
          )}

          {!loading && entries.length > 0 && (
            <div className="divide-y-2 divide-black">
              {entries.map((entry) => {
                const isYou = address?.toLowerCase() === entry.walletAddress?.toLowerCase();
                return (
                  <LeaderboardRow
                    key={entry.walletAddress}
                    entry={entry}
                    isYou={Boolean(isYou)}
                    formatAddress={formatAddress}
                  />
                );
              })}
            </div>
          )}

          {loadingMore && (
            <div className="p-4 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              <div className="font-black text-black mt-1 text-xs uppercase">Loading more...</div>
            </div>
          )}
        </div>

        <div className="text-center mt-2 font-bold text-xs uppercase text-black/60">
          Showing {entries.length} of {total}
          {hasMore ? " — scroll for more" : ""}
        </div>
      </div>
    </main>
  );
}

function LeaderboardRow({
  entry,
  isYou,
  formatAddress,
}: {
  entry: PuzzleRushLeaderboardEntry;
  isYou: boolean;
  formatAddress: (a: string) => string;
}) {
  return (
    <div
      className="px-3 py-3 grid grid-cols-[3rem_1fr_6rem] gap-2 items-center bg-white"
      style={isYou ? { background: "#cffafe" } : undefined}
    >
      <span className="font-black text-black">
        {entry.rank === 1 ? <Medal className="w-5 h-5 text-yellow-500 fill-yellow-500" /> : entry.rank === 2 ? <Medal className="w-5 h-5 text-gray-500 fill-gray-300" /> : entry.rank === 3 ? <Medal className="w-5 h-5 text-amber-700 fill-orange-400" /> : `#${entry.rank}`}
      </span>
      <div className="min-w-0">
        <div className="font-black text-black text-sm truncate flex items-center gap-1.5">
          {entry.displayName}
          {isYou && <span className="text-[10px] bg-cyan-500 text-black px-1 font-black">YOU</span>}
        </div>
        <div className="text-[10px] font-bold text-black/50">{formatAddress(entry.walletAddress)}</div>
      </div>
      <span className="text-right font-black text-black">{entry.bestScore}</span>
    </div>
  );
}
