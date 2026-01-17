"use client";

import { useEffect, useState, useRef } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ChessBoard, { ChessBoardRef } from "../../components/chess-board";
import { useUserStats } from "../../lib/hooks/useUserStats";
import { Puzzle } from "../../lib/types";

type HintStage = 'none' | 'piece' | 'move';

export default function SolvePuzzlesPage() {
  const [mounted, setMounted] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<{
    hasAccess: boolean;
    hasDailyAccess?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
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
  
  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [currentTurn, setCurrentTurn] = useState<"w" | "b">("w");

  const chessBoardRef = useRef<ChessBoardRef>(null);
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
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setCompletionStats({
          timeElapsed: finalElapsedTime,
          mistakes: mistakeCount,
          points: result.points,
          hintCount: hintCount,
        });
      }
    } catch (error) {
      console.error("Failed to submit puzzle solution:", error);
    }
  };

  const handleShowHint = () => {
    if (hintStage === 'none') {
      // First click: show piece to move
      setHintStage('piece');
      const nextMove = chessBoardRef.current?.getNextMove();
      if (nextMove) {
        setHighlightedSquares({ from: nextMove.from });
      }
    } else if (hintStage === 'piece') {
      // Second click: show target square too (and count this as using a hint)
      setHintStage('move');
      setHintCount(prev => prev + 1);
      const nextMove = chessBoardRef.current?.getNextMove();
      if (nextMove) {
        setHighlightedSquares({ from: nextMove.from, to: nextMove.to });
      }
    }
    // After 'move' stage, button becomes disabled until next correct move
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
    // Reset hint stage when a correct move is made
    setHintStage('none');
    setHighlightedSquares(null);
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
    return 5;
  };

  const MAX_DAILY_PUZZLES = getMaxDailyPuzzles();
  const isAccessExhausted = solvedPuzzlesCount >= MAX_DAILY_PUZZLES;

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
              paymentStatus?.hasDailyAccess ? "bg-yellow-400 text-black" : "bg-cyan-400 text-black"
            }`}
          >
            ⚡ PUZZLES ({solvedPuzzlesCount}/{MAX_DAILY_PUZZLES})
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
              className="absolute top-2 right-2 w-8 h-8 bg-white border-2 border-black font-black text-black hover:bg-gray-100 transition-colors flex items-center justify-center"
            >
              ✕
            </button>
            
            <div className="text-3xl font-black text-black mb-4 transform -rotate-2">PUZZLE SOLVED! 🎉</div>
            <div className="space-y-2 text-lg font-black text-black">
              <div className="bg-white border-2 border-black p-2">TIME: {formatTime(completionStats.timeElapsed)}</div>
              <div className="bg-white border-2 border-black p-2">MISTAKES: {completionStats.mistakes}</div>
              {completionStats.hintCount > 0 && (
                <div className="bg-yellow-200 border-2 border-black p-2">
                  HINTS USED: {completionStats.hintCount} 💡
                </div>
              )}
              <div className="bg-white border-2 border-black p-2">POINTS: +{completionStats.points}</div>
            </div>
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
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-3 min-h-0">
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
                  {currentTurn === "w" ? "⚪ WHITE TO MOVE" : "⚫ BLACK TO MOVE"}
                </div>
              </div>

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
                    🔄 RETRY
                  </button>
                ) : (
                  <button
                    onClick={handleShowHint}
                    disabled={hintStage === 'move' || canGoForward}
                    className={`flex-1 text-black py-2 px-4 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                      hintStage === 'move' || canGoForward
                        ? "bg-yellow-200 opacity-50 cursor-not-allowed"
                        : hintCount > 0
                        ? "bg-yellow-200 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px"
                        : "bg-yellow-400 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px"
                    }`}
                  >
                    {hintStage === 'none' && `💡 HINT${hintCount > 0 ? ` (${hintCount})` : ''}`}
                    {hintStage === 'piece' && '👆 SHOW MOVE'}
                    {hintStage === 'move' && '✓ HINT SHOWN'}
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
              
              {/* Hint count indicator */}
              {hintCount > 0 && !isCompleted && (
                <div className="text-center text-sm font-bold text-gray-600">
                  Hints used: {hintCount} {hintCount >= 3 ? '(0 points)' : hintCount === 2 ? '(25% points)' : '(50% points)'}
                </div>
              )}
              
              {/* Completed indicator */}
              {isCompleted && (
                <div className="text-center text-sm font-bold text-green-600">
                  ✓ Puzzle completed! Use ← → to analyze the solution.
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

        {/* Show daily limit reached message */}
        {!currentPuzzle && !isCompleted && isAccessExhausted && (
          <div className="w-full max-w-xs text-center space-y-6">
            <div className="bg-red-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform rotate-1">
              <h2 className="text-3xl font-black text-black mb-3">DAILY LIMIT REACHED! 🚫</h2>
              <p className="text-lg font-bold text-black">You&apos;ve solved all {MAX_DAILY_PUZZLES} puzzles for today.</p>
              <p className="text-md font-bold text-black mt-2">Come back tomorrow for more puzzles!</p>
            </div>

            <Link
              href="/"
              className="inline-block w-full bg-black text-white py-4 px-6 font-black text-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
            >
              GO HOME
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
