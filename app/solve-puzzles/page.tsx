"use client";

import { useEffect, useState, useRef } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Ban, Check, Circle, Lightbulb, X, Zap } from "lucide-react";
import ChessBoard, { ChessBoardRef } from "../../components/chess-board";
import { useUserStats } from "../../lib/hooks/useUserStats";
import { useHintBalance } from "../../lib/hooks/useHintBalance";
import { Puzzle } from "../../lib/types";
import { getThemeById } from "../../lib/config/puzzleThemes";
import { TelegramSupportLink } from "@/components/TelegramSupportLink";
import { BottomNav } from "@/components/BottomNav";
import { PointsCountUp } from "@/components/PointsCountUp";
import { toast } from "sonner";

type HintStage = 'none' | 'piece' | 'move';

export default function SolvePuzzlesPage() {
  const [mounted, setMounted] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<{
    hasAccess: boolean;
    hasDailyAccess?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessConfig, setAccessConfig] = useState<{ dailyFreePuzzles: number; unlockAmountUsd: string } | null>(null);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [puzzleProgress, setPuzzleProgress] = useState(0);
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [puzzleLoading, setPuzzleLoading] = useState(false);
  const [solvedPuzzlesCount, setSolvedPuzzlesCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionStats, setCompletionStats] = useState<{
    timeElapsed: number;
    mistakes: number;
    points: number;
    hintCount: number;
    breakdown: any | null;
    oldTotal: number;
    newTotal: number;
    levelUp: any | null;
  } | null>(null);
  
  // Hint state
  const [hintStage, setHintStage] = useState<HintStage>('none');
  const [hintCount, setHintCount] = useState(0);
  const [highlightedSquares, setHighlightedSquares] = useState<{ from?: string; to?: string } | null>(null);
  
  // History navigation state
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  
  // Wrong move state
  const [isWrongMoveActive, setIsWrongMoveActive] = useState(false);
  const [movePulse, setMovePulse] = useState(false);
  
  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [currentTurn, setCurrentTurn] = useState<"w" | "b">("w");

  const chessBoardRef = useRef<ChessBoardRef>(null);
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { userStats } = useUserStats();
  const { hintBalance, outOfHints, consume: consumeHint } = useHintBalance();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isConnected) {
      router.push("/");
      return;
    }

    if (mounted && address) {
      checkPaymentStatus();
      checkSolvedPuzzlesCount();
      fetchAccessConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, address, isConnected, router]);

  const autoFetchedRef = useRef(false);

  useEffect(() => {
    if (!mounted || !address || loading || autoFetchedRef.current || !accessConfig) return;
    const limit = paymentStatus?.hasDailyAccess ? 999 : accessConfig.dailyFreePuzzles;
    if (solvedPuzzlesCount < limit && !currentPuzzle && !isCompleted) {
      autoFetchedRef.current = true;
      fetchPuzzle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, address, loading, paymentStatus, solvedPuzzlesCount, currentPuzzle, isCompleted, accessConfig]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (startTime && !isCompleted) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [startTime, isCompleted]);

  const checkPaymentStatus = async () => {
    if (!address) return;

    try {
      const response = await fetch(`/api/payments/status?walletAddress=${address}`);
      if (response.ok) {
        const status = await response.json();
        setPaymentStatus(status);
      }
    } catch (error) {
      console.error("Failed to check payment status:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessConfig = async () => {
    try {
      const res = await fetch("/api/config/public");
      if (res.ok) {
        const data = await res.json();
        setAccessConfig({ dailyFreePuzzles: data.dailyFreePuzzles, unlockAmountUsd: data.unlockAmountUsd });
      }
    } catch {
      // use defaults
    }
  };

  const checkSolvedPuzzlesCount = async () => {
    if (!address) return;

    try {
      const response = await fetch(`/api/puzzles/solve/status`, {
        headers: {
          Authorization: `Bearer ${address}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSolvedPuzzlesCount(data.count);
      }
    } catch (error) {
      console.error("Failed to check daily count:", error);
    }
  };

  const fetchPuzzle = async () => {
    if (!address) return;

    setPuzzleLoading(true);
    try {
      const modeParam =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("mode") === "custom"
          ? "custom"
          : "adaptive";
      const response = await fetch(`/api/puzzles/solve/new?mode=${modeParam}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${address}`,
        },
      });

      if (response.status === 429) {
        // Daily limit reached - update count to show exhausted state
        setSolvedPuzzlesCount(MAX_DAILY_PUZZLES);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setCurrentPuzzle(data.puzzle);
        setStartTime(Date.now());
        setElapsedTime(0);
        // Update count from server response to ensure accuracy
        setSolvedPuzzlesCount(data.puzzleCount || solvedPuzzlesCount + 1);
      } else {
        throw new Error("Failed to fetch daily puzzle");
      }
    } catch (error) {
      console.error("Failed to fetch daily puzzle:", error);
    } finally {
      setPuzzleLoading(false);
    }
  };

  const handlePuzzleComplete = async () => {
    if (!currentPuzzle || !startTime) return;

    const finalElapsedTime = Date.now() - startTime;
    setIsCompleted(true);
    setShowCompletionModal(true);

    try {
      const response = await fetch("/api/puzzles/solve/solve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${address}`,
        },
        body: JSON.stringify({
          puzzleId: currentPuzzle.puzzleid,
          mistakes: mistakeCount,
          hintCount: hintCount,
          rating: currentPuzzle.rating,
          solveTimeSec: Math.floor(finalElapsedTime / 1000),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const oldTotal = Math.max(0, Math.floor(userStats?.points ?? 0));
        const awardedPoints = result.points ?? 0;
        setCompletionStats({
          timeElapsed: finalElapsedTime,
          mistakes: mistakeCount,
          points: awardedPoints,
          hintCount: hintCount,
          breakdown: result.breakdown ?? null,
          oldTotal,
          newTotal: oldTotal + awardedPoints,
          levelUp: result.levelUp ?? null,
        });
      }
    } catch (error) {
      console.error("Failed to submit puzzle solution:", error);
    }
  };

  const handleShowHint = async () => {
    if (hintBalance <= 0) {
      router.push("/store");
      return;
    }
    if (hintStage === 'none') {
      const ok = await consumeHint();
      if (!ok) {
        toast.error("Out of hints", { description: "Buy more in the Store." });
        return;
      }
      setHintCount(prev => prev + 1);
      setHintStage('piece');
      const nextMove = chessBoardRef.current?.getNextMove();
      if (nextMove) {
        setHighlightedSquares({ from: nextMove.from });
      }
    } else if (hintStage === 'piece') {
      const ok = await consumeHint();
      if (!ok) {
        toast.error("Out of hints", { description: "Buy more in the Store." });
        return;
      }
      setHintCount(prev => prev + 1);
      setHintStage('move');
      const nextMove = chessBoardRef.current?.getNextMove();
      if (nextMove) {
        setHighlightedSquares({ from: nextMove.from, to: nextMove.to });
      }
    }
  };

  const handleBack = () => {
    chessBoardRef.current?.goBack();
  };

  const handleForward = () => {
    chessBoardRef.current?.goForward();
  };

  const handleRetry = () => {
    chessBoardRef.current?.undoWrongMove();
  };

  const handleHistoryChange = (back: boolean, forward: boolean) => {
    setCanGoBack(back);
    setCanGoForward(forward);
  };

  const handleWrongMoveStateChange = (isWrongMove: boolean) => {
    setIsWrongMoveActive(isWrongMove);
  };

  const handleProgress = (progress: number) => {
    setPuzzleProgress(progress);
    setHintStage('none');
    setHighlightedSquares(null);
    setMovePulse(true);
    window.setTimeout(() => setMovePulse(false), 360);
  };

  const handleStartNewPuzzle = () => {
    setCurrentPuzzle(null);
    setIsCompleted(false);
    setCompletionStats(null);
    setShowCompletionModal(false);
    setMistakeCount(0);
    setPuzzleProgress(0);
    setStartTime(null);
    setElapsedTime(0);
    setHintStage('none');
    setHintCount(0);
    setHighlightedSquares(null);
    setCanGoBack(false);
    setCanGoForward(false);
    setIsWrongMoveActive(false);
    setCurrentMoveIndex(0);
    
    // Immediately fetch a new puzzle
    fetchPuzzle();
  };

  const handleCloseCompletionModal = () => {
    setShowCompletionModal(false);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  const getThemeLabel = (themeId: string) => {
    const configuredTheme = getThemeById(themeId);
    if (configuredTheme) return configuredTheme.name;

    return themeId
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="h-dvh w-full app-paper-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-black"></div>
      </div>
    );
  }

  // Calculate limits based on payment status
  const MAX_DAILY_PUZZLES = accessConfig?.dailyFreePuzzles ?? 3;
  const isAccessExhausted = solvedPuzzlesCount >= MAX_DAILY_PUZZLES && !paymentStatus?.hasDailyAccess;

  return (
    <div className="h-dvh w-full app-paper-bg text-black flex flex-col overflow-hidden">
      {/* Header with Streak Badge and Back Button */}
      <header className="pt-4 px-4 flex justify-between items-center shrink-0">
        <Link
          href="/"
          className="bg-black text-white px-2 py-1 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all"
        >
          ← BACK
        </Link>
        <div className="flex items-center gap-3">
          <div
            className={`px-4 py-2 font-black text-sm border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
              paymentStatus?.hasDailyAccess ? "bg-yellow-400 text-black" : "bg-cyan-400 text-black"
            }`}
          >
            <span className="inline-flex items-center gap-1">
              <Zap className="w-4 h-4" /> PUZZLES ({solvedPuzzlesCount}/{MAX_DAILY_PUZZLES})
            </span>
          </div>
        </div>
      </header>

      {/* Completion Modal */}
      {showCompletionModal && completionStats && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xs bg-green-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 text-center relative">
            {/* Close button */}
            <button
              onClick={handleCloseCompletionModal}
              className="absolute top-2 right-2 w-8 h-8 bg-white border-2 border-black text-black hover:bg-gray-100 transition-colors flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="text-3xl font-black text-black mb-4 transform mt-4 -rotate-2">PUZZLE SOLVED!</div>
            <div className="space-y-2 text-lg font-black text-black">
              <div className="bg-white border-2 border-black p-2">TIME: {formatTime(completionStats.timeElapsed)}</div>
              <div className="bg-white border-2 border-black p-2">MISTAKES: {completionStats.mistakes}</div>
              {completionStats.hintCount > 0 && (
                <div className="bg-yellow-200 border-2 border-black p-2 inline-flex items-center gap-1 justify-center w-full">
                  HINTS USED: {completionStats.hintCount} <Lightbulb className="w-4 h-4" />
                </div>
              )}
            </div>
            <div className="mt-3">
              <PointsCountUp
                breakdown={completionStats.breakdown}
                oldTotal={completionStats.oldTotal}
                newTotal={completionStats.newTotal}
              />
            </div>
            {completionStats.levelUp && (
              <div className="mt-3 bg-yellow-300 border-2 border-black p-3">
                <div className="font-black text-sm text-black">
                  LEVEL UP! {completionStats.levelUp.oldLevel} → {completionStats.levelUp.newLevel}
                </div>
                {completionStats.levelUp.rewards?.map((r: any, i: number) => (
                  <div key={i} className="text-xs font-bold text-black mt-1">
                    Milestone {completionStats.levelUp.milestonesHit[i]} — +{r.hints} hints, +{r.streakFreezes} streak freezes
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 space-y-2">
              <button
                onClick={handleStartNewPuzzle}
                className="w-full bg-black text-white px-6 py-3 font-black text-lg border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                NEXT PUZZLE →
              </button>
              <button
                onClick={handleCloseCompletionModal}
                className="w-full bg-white text-black px-6 py-2 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all"
              >
                ANALYZE POSITION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-4 py-6 gap-3 min-h-0">
        {/* Show puzzle interface if puzzle is loaded */}
        {currentPuzzle && (
          <>
            {" "}
            <div className="w-full max-w-xs shrink-0">
              {/* Turn Indicator */}
              <div className="mb-3 text-center">
                <div
                  className={`inline-block px-4 py-2 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    currentTurn === "w" ? "bg-white text-black" : "bg-gray-800 text-white"
                  }`}
                >
                  {currentTurn === "w" ? (
                    <span className="inline-flex items-center gap-1">
                      <Circle className="w-3.5 h-3.5" /> WHITE TO MOVE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Circle className="w-3.5 h-3.5 fill-current" /> BLACK TO MOVE
                    </span>
                  )}
                </div>
              </div>

              {currentPuzzle.themes.length > 0 && (
                <div className="mb-3 flex flex-wrap justify-center gap-1.5">
                  {currentPuzzle.themes.slice(0, 5).map((themeId) => (
                    <span
                      key={themeId}
                      className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black bg-lime-300 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      title={themeId}
                    >
                      {getThemeLabel(themeId)}
                    </span>
                  ))}
                  {currentPuzzle.themes.length > 5 && (
                    <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      +{currentPuzzle.themes.length - 5}
                    </span>
                  )}
                </div>
              )}

              <div className={`transition-shadow duration-200 ${movePulse ? 'shadow-[0_0_0_4px_rgba(255,214,0,0.8)]' : ''}`}>
                <ChessBoard
                  ref={chessBoardRef}
                  puzzle={currentPuzzle}
                  onComplete={handlePuzzleComplete}
                  onProgress={handleProgress}
                  onWrongMove={() => setMistakeCount((prev) => prev + 1)}
                  onMoveIndexChange={setCurrentMoveIndex}
                  onTurnChange={setCurrentTurn}
                  onWrongMoveStateChange={handleWrongMoveStateChange}
                  onHistoryChange={handleHistoryChange}
                  highlightedSquares={highlightedSquares}
                />
              </div>
            </div>
            <div className="w-full max-w-xs shrink-0 space-y-3">
              {/* Navigation and Hint Controls */}
              <div className="flex gap-2">
                {/* Back Button */}
                <button
                  onClick={handleBack}
                  disabled={!canGoBack}
                  className={`py-2 px-4 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                    canGoBack 
                      ? "bg-gray-300 text-black hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px" 
                      : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                  }`}
                >
                  ← BACK
                </button>
                
                {/* Hint/Retry/Next Button */}
                {isCompleted ? (
                  <button
                    onClick={handleStartNewPuzzle}
                    className="flex-1 text-white py-2 px-4 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all bg-green-600"
                  >
                    NEXT PUZZLE →
                  </button>
                ) : isWrongMoveActive ? (
                  <button
                    onClick={handleRetry}
                    className="flex-1 text-black py-2 px-4 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all bg-red-400"
                  >
                    RETRY
                  </button>
                ) : (
                  <button
                    onClick={handleRetry}
                    className="flex-1 text-black py-2 px-4 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all bg-red-400"
                  >
                    RETRY
                  </button>
                )}
                
                {/* Next Button */}
                <button
                  onClick={handleForward}
                  disabled={!canGoForward}
                  className={`py-2 px-4 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                    canGoForward 
                      ? "bg-gray-300 text-black hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px" 
                      : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                  }`}
                >
                  NEXT →
                </button>
              </div>

              {/* Full-width Hint Button */}
              {!isCompleted && !isWrongMoveActive && hintStage !== 'move' && (
                <button
                  onClick={handleShowHint}
                  className="w-full text-black py-3 px-4 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all bg-yellow-400 inline-flex items-center justify-center gap-2"
                >
                  <Lightbulb className="w-4 h-4" />
                  {hintBalance > 0 ? (
                    <>
                      <span>Hint</span>
                      <span className="bg-black text-yellow-400 px-2 py-0.5 text-xs font-black">{hintBalance}</span>
                    </>
                  ) : (
                    <>
                      <span>Get Hints</span>
                      <span className="bg-black text-yellow-400 px-1.5 py-0.5 text-xs font-black">+</span>
                    </>
                  )}
                </button>
              )}
              {!isCompleted && !isWrongMoveActive && hintStage === 'move' && (
                <div className="w-full text-black py-3 px-4 font-black text-xs border-2 border-black bg-yellow-200 inline-flex items-center justify-center gap-2 opacity-60">
                  <Check className="w-4 h-4" /> HINT SHOWN
                </div>
              )}

              {/* Hint count indicator */}
              {hintCount > 0 && !isCompleted && (
                <div className="text-center text-xs font-black uppercase text-black bg-yellow-200 border-2 border-black p-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Hints used: {hintCount} (−{hintCount >= 3 ? "all" : hintCount === 2 ? "60" : "30"} pts)
                </div>
              )}
              
              {/* Completed indicator */}
              {isCompleted && (
                <div className="text-center text-sm font-bold text-green-600 inline-flex items-center gap-1 justify-center w-full">
                  <Check className="w-4 h-4" /> Puzzle completed! Use ← → to analyze the solution.
                </div>
              )}
            </div>
          </>
        )}

        {/* Show loading indicator while puzzle is being fetched */}
        {!currentPuzzle && !isCompleted && !isAccessExhausted && puzzleLoading && (
          <div className="w-full max-w-xs text-center">
            <div className="bg-yellow-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-black mx-auto mb-3"></div>
              <p className="text-lg font-black text-black">LOADING PUZZLE...</p>
            </div>
          </div>
        )}

        {/* Fallback retry if puzzle didn't load automatically */}
        {!currentPuzzle && !isCompleted && !isAccessExhausted && !puzzleLoading && (
          <div className="w-full max-w-xs text-center space-y-6">
            <div className="bg-yellow-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform -rotate-1">
              <h2 className="text-3xl font-black text-black mb-3">SOLVE PUZZLES</h2>
              <p className="text-lg font-bold text-black">SOLVE CHESS PUZZLES AND EARN POINTS!</p>
            </div>

            <button
              onClick={() => { autoFetchedRef.current = false; fetchPuzzle(); }}
              className="w-full bg-green-400 text-black py-4 px-6 font-black text-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
            >
              START
            </button>
          </div>
        )}

        {/* Show daily limit reached message */}
        {!currentPuzzle && !isCompleted && isAccessExhausted && (
          <div className="w-full max-w-xs text-center space-y-6">
            <div className="bg-red-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform rotate-1 text-left">
              <h2 className="text-3xl font-black text-black mb-3 inline-flex items-center gap-2 uppercase">
                Daily Limit Reached! <Ban className="w-8 h-8 shrink-0" />
              </h2>
              <p className="text-lg font-bold text-black uppercase">You&apos;ve used all {MAX_DAILY_PUZZLES} free puzzles today.</p>
              <p className="text-md font-bold text-black mt-2 uppercase">Pay ${accessConfig?.unlockAmountUsd ?? "0.01"} USDT to unlock unlimited puzzles for the rest of the day — or come back tomorrow!</p>
              <TelegramSupportLink />
            </div>

            <Link
              href="/store"
              className="inline-block w-full bg-lime-400 text-black py-4 px-6 font-black text-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
            >
              UNLOCK UNLIMITED · STORE
            </Link>

            <Link
              href="/"
              className="inline-block w-full bg-black text-white py-4 px-6 font-black text-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
            >
              GO HOME
            </Link>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
