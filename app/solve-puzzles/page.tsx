"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ChessBoard from "../../components/chess-board";
import PuzzleActions from "../../components/puzzle-actions";
import PaywallCard from "../../components/paywall-card";
import { useUserStats } from "../../lib/hooks/useUserStats";
import { Puzzle } from "../../lib/types";

export default function SolvePuzzlesPage() {
  const [mounted, setMounted] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<{
    hasAccess: boolean;
    hasPremium: boolean;
    hasDailyAccess?: boolean;
    hasStreakPremium?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [attemptCount, setAttemptCount] = useState(1);
  const [puzzleProgress, setPuzzleProgress] = useState(0);
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [puzzleLoading, setPuzzleLoading] = useState(false);
  const [solvedPuzzlesCount, setSolvedPuzzlesCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionStats, setCompletionStats] = useState<{
    timeElapsed: number;
    attempts: number;
    points: number;
  } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [currentTurn, setCurrentTurn] = useState<"w" | "b">("w");

  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { userStats } = useUserStats();

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
    }
  }, [mounted, address, isConnected, router]);

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
      // Get today's puzzle and create user tracking in one call
      const response = await fetch("/api/puzzles/solve/new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${address}`,
        },
      });

      if (response.status === 429) {
        // Daily limit reached
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

    try {
      const response = await fetch("/api/puzzles/solve/solve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${address}`,
        },
        body: JSON.stringify({
          puzzleId: currentPuzzle.puzzleid,
          attempts: attemptCount,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setCompletionStats({
          timeElapsed: finalElapsedTime,
          attempts: attemptCount,
          points: result.points,
        });
      }
    } catch (error) {
      console.error("Failed to submit puzzle solution:", error);
    }
  };

  const handleRetry = () => {
    setAttemptCount((prev) => prev + 1);
    setPuzzleProgress(0);
    setShowHint(false);
    setShowSolution(false);
    setCurrentMoveIndex(0);
    // Reset the puzzle by refetching it
    if (currentPuzzle) {
      const tempPuzzle = currentPuzzle;
      setCurrentPuzzle(null);
      setTimeout(() => {
        setCurrentPuzzle(tempPuzzle);
        setStartTime(Date.now());
        setElapsedTime(0);
      }, 100);
    }
  };

  const handleStartNewPuzzle = () => {
    setCurrentPuzzle(null);
    setIsCompleted(false);
    setCompletionStats(null);
    setAttemptCount(1);
    setPuzzleProgress(0);
    setStartTime(null);
    setElapsedTime(0);
    setShowHint(false);
    setShowSolution(false);
    setCurrentMoveIndex(0);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="w-screen h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Calculate limits based on payment status
  const getMaxDailyPuzzles = () => {
    if (paymentStatus?.hasPremium) return Infinity;
    return 5;
  };

  const MAX_DAILY_PUZZLES = getMaxDailyPuzzles();
  const isAccessExhausted = solvedPuzzlesCount >= MAX_DAILY_PUZZLES && MAX_DAILY_PUZZLES !== Infinity;

  return (
    <div className="min-h-screen w-full bg-white text-black flex flex-col">
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
              paymentStatus?.hasPremium || paymentStatus?.hasStreakPremium
                ? "bg-green-400 text-black"
                : paymentStatus?.hasDailyAccess
                ? "bg-yellow-400 text-black"
                : "bg-cyan-400 text-black"
            }`}
          >
            {paymentStatus?.hasPremium || paymentStatus?.hasStreakPremium
              ? "🏆 PREMIUM"
              : `⚡ PUZZLES (${solvedPuzzlesCount}/${MAX_DAILY_PUZZLES})`}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-3 min-h-0">
        {/* Show completion stats if puzzle is completed */}
        {isCompleted && completionStats && (
          <div className="w-full max-w-xs bg-green-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 text-center mb-4">
            <div className="text-3xl font-black text-black mb-4 transform -rotate-2">
              PUZZLE SOLVED! 🎉
            </div>
            <div className="space-y-2 text-lg font-black text-black">
              <div className="bg-white border-2 border-black p-2">
                TIME: {formatTime(completionStats.timeElapsed)}
              </div>
              <div className="bg-white border-2 border-black p-2">
                TRIES: {completionStats.attempts}
              </div>
              <div className="bg-white border-2 border-black p-2">
                POINTS: {completionStats.points}
              </div>
            </div>
            <button
              onClick={handleStartNewPuzzle}
              className="mt-4 bg-black text-white px-6 py-3 font-black text-lg border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
            >
              NEW PUZZLE
            </button>
          </div>
        )}

        {/* Show puzzle interface if puzzle is loaded and not completed */}
        {currentPuzzle && !isCompleted && (
          <>
            <div className="flex gap-2 mb-3 justify-center">
              <div className="bg-orange-400 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] px-3 py-1 font-black text-sm">
                {Math.floor(elapsedTime / 1000)}s
              </div>
              <div className="bg-magenta-500 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] px-3 py-1 font-black text-sm">
                TRY {attemptCount}
              </div>
            </div>

            <div className="w-full max-w-xs shrink-0">
              {/* Turn Indicator */}
              <div className="mb-3 text-center">
                <div
                  className={`inline-block px-4 py-2 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    currentTurn === "w" ? "bg-white text-black" : "bg-gray-800 text-white"
                  }`}
                >
                  {currentTurn === "w" ? "⚪ WHITE TO MOVE" : "⚫ BLACK TO MOVE"}
                </div>
              </div>

              <ChessBoard
                puzzle={currentPuzzle}
                onComplete={handlePuzzleComplete}
                onProgress={setPuzzleProgress}
                onWrongMove={() => setAttemptCount((prev) => prev + 1)}
                onMoveIndexChange={setCurrentMoveIndex}
                onTurnChange={setCurrentTurn}
              />
            </div>

            <div className="w-full max-w-xs shrink-0 space-y-3">
              <PuzzleActions onRetry={handleRetry} />

              {/* Hint Section */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="flex-1 bg-yellow-400 text-black py-2 px-4 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all"
                >
                  {showHint ? "HIDE HINT" : "SHOW HINT"}
                </button>
                <button
                  onClick={() => setShowSolution(!showSolution)}
                  className="flex-1 bg-purple-400 text-black py-2 px-4 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all"
                >
                  {showSolution ? "HIDE SOLUTION" : "SHOW SOLUTION"}
                </button>
              </div>

              {showHint && currentPuzzle && (
                <div className="bg-blue-400 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-3">
                  <div className="font-black text-sm text-black mb-2">PUZZLE THEMES:</div>
                  <div className="flex flex-wrap gap-1">
                    {currentPuzzle.themes.map((theme, index) => (
                      <span
                        key={index}
                        className="bg-white border border-black px-2 py-1 text-xs font-bold text-black"
                      >
                        {theme.toUpperCase()}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-xs font-bold text-black">
                    RATING: {currentPuzzle.rating}
                  </div>
                </div>
              )}

              {showSolution && currentPuzzle && (
                <div className="bg-purple-400 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-3">
                  <div className="font-black text-sm text-black mb-2">SOLUTION MOVES:</div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {currentPuzzle.moves.map((move, index) => {
                      const isCurrentMove = index === currentMoveIndex;
                      const isCompletedMove = index < currentMoveIndex;
                      const moveNumber = Math.floor(index / 2) + 1;
                      const isWhiteMove = index % 2 === 0;

                      return (
                        <div
                          key={index}
                          className={`px-2 py-1 border border-black font-bold ${
                            isCurrentMove
                              ? "bg-orange-300 text-black"
                              : isCompletedMove
                              ? "bg-green-300 text-black"
                              : "bg-white text-black"
                          }`}
                        >
                          {moveNumber}
                          {isWhiteMove ? "." : "..."} {move.toUpperCase()}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-xs font-bold text-black">
                    🟠 CURRENT MOVE • 🟢 COMPLETED • ⚪ REMAINING
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Show start button if no puzzle loaded */}
        {!currentPuzzle && !isCompleted && !isAccessExhausted && (
          <div className="w-full max-w-xs text-center space-y-6">
            <div className="bg-yellow-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform -rotate-1">
              <h2 className="text-3xl font-black text-black mb-3">SOLVE PUZZLES</h2>
              <p className="text-lg font-bold text-black">SOLVE CHESS PUZZLES AND EARN POINTS!</p>
            </div>

            <button
              onClick={fetchPuzzle}
              disabled={puzzleLoading}
              className="w-full bg-green-400 text-black py-4 px-6 font-black text-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all disabled:opacity-50 disabled:hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
            >
              {puzzleLoading ? "LOADING PUZZLE..." : "START"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
