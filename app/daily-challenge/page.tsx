"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { sdk } from "@farcaster/miniapp-sdk";
import confetti from "canvas-confetti";
import { AtSign, Coins, Send, Share2, TriangleAlert } from "lucide-react";
import { useAccount } from "wagmi";

import ChessBoard, { ChessBoardRef } from "@/components/chess-board";
import { WalletConnect } from "@/components/WalletConnect";
import { useChainSwitching } from "@/lib/hooks/useChainSwitching";
import { useCheckinClaim } from "@/lib/hooks/useCheckinClaim";
import { useDailyCheckin } from "@/lib/hooks/useDailyCheckin";
import { Puzzle } from "@/lib/types";

type HintStage = "none" | "piece" | "move";

export default function DailyChallengePage() {
  const [mounted, setMounted] = useState(false);
  const [puzzleLoading, setPuzzleLoading] = useState(false);
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [hintStage, setHintStage] = useState<HintStage>("none");
  const [hintCount, setHintCount] = useState(0);
  const [highlightedSquares, setHighlightedSquares] = useState<{ from?: string; to?: string } | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isWrongMoveActive, setIsWrongMoveActive] = useState(false);
  const [isFarcasterMiniApp, setIsFarcasterMiniApp] = useState(false);
  const [isSolving, setIsSolving] = useState(false);

  const chessBoardRef = useRef<ChessBoardRef>(null);
  const claimCardRef = useRef<HTMLDivElement>(null);
  const statusMessageRef = useRef<HTMLDivElement>(null);

  const { address, isConnected } = useAccount();
  const { isOnCorrectChain, switchToPreferredChain } = useChainSwitching();
  const {
    status,
    loading,
    error,
    refreshStatus,
    reserveDailyChallenge,
    solveDailyChallenge,
    confirmClaim,
  } = useDailyCheckin();
  const {
    sendClaim,
    txHash,
    isPending: claimSubmitting,
    isConfirming: claimConfirming,
    isSuccess: claimTxMined,
    claimError,
  } = useCheckinClaim();

  const logClaimFlow = (step: string, details?: Record<string, unknown>) => {
    console.info("[ClaimFlow][DailyChallengePage]", step, details || {});
  };

  const scrollElementIntoView = (element: HTMLElement | null) => {
    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const detectMiniApp = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        if (!cancelled) {
          setIsFarcasterMiniApp(inMiniApp);
        }
      } catch {
        if (!cancelled) {
          setIsFarcasterMiniApp(false);
        }
      }
    };

    void detectMiniApp();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!status?.challenge) {
      return;
    }

    const reservationStatus = status.reservation?.status;
    if (reservationStatus === "claimed") {
      setCurrentPuzzle(null);
      setIsCompleted(false);
      return;
    }

    if (!reservationStatus || reservationStatus === "expired" || reservationStatus === "failed") {
      return;
    }

    setCurrentPuzzle({
      puzzleid: status.challenge.puzzleId,
      fen: status.challenge.fen,
      rating: status.challenge.rating,
      ratingdeviation: status.challenge.ratingDeviation,
      moves: status.challenge.moves,
      themes: status.challenge.themes,
    });

    if (status.reservation?.status === "earned" || status.reservation?.status === "claiming") {
      setIsCompleted(true);
      return;
    }

    setIsCompleted(false);
  }, [status]);

  useEffect(() => {
    if (!claimTxMined || !txHash) {
      return;
    }

    logClaimFlow("confirm.effect.start", { txHash, claimTxMined });

    let attempts = 0;
    let isCancelled = false;

    const confirmWithRetry = async () => {
      while (!isCancelled && attempts < 6) {
        attempts += 1;
        logClaimFlow("confirm.effect.attempt", { txHash, attempt: attempts });
        try {
          const confirmation = await confirmClaim(txHash);
          logClaimFlow("confirm.effect.response", {
            txHash,
            attempt: attempts,
            success: confirmation.success,
            pending: confirmation.pending,
            message: confirmation.message,
          });
          if (confirmation.success) {
            setClaimMessage("Reward claimed successfully");
            fireConfetti();
            await refreshStatus();
            return;
          }

          if (!confirmation.pending) {
            setClaimMessage(confirmation.message || "Claim confirmation failed");
            return;
          }
        } catch (err: any) {
          logClaimFlow("confirm.effect.error", {
            txHash,
            attempt: attempts,
            message: err?.message,
          });
          setClaimMessage(err.message || "Claim confirmation failed");
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (!isCancelled) {
        logClaimFlow("confirm.effect.timeout", { txHash, attempts });
        setClaimMessage("Transaction submitted. Confirmation is still pending.");
      }
    };

    confirmWithRetry();

    return () => {
      isCancelled = true;
    };
  }, [claimTxMined, txHash, confirmClaim, refreshStatus]);

  useEffect(() => {
    if (!isCompleted) {
      return;
    }

    // Wait for the claim section to render before scrolling.
    const timer = setTimeout(() => {
      scrollElementIntoView(claimCardRef.current);
    }, 0);

    return () => clearTimeout(timer);
  }, [isCompleted]);

  useEffect(() => {
    if (!(claimMessage || claimError || error)) {
      return;
    }

    const timer = setTimeout(() => {
      scrollElementIntoView(statusMessageRef.current);
    }, 0);

    return () => clearTimeout(timer);
  }, [claimMessage, claimError, error]);

  const pendingSeconds = useMemo(() => {
    const expiry = status?.reservation?.pendingExpiresAt;
    if (!expiry) return 0;

    const diff = Math.floor((new Date(expiry).getTime() - Date.now()) / 1000);
    return Math.max(diff, 0);
  }, [status?.reservation?.pendingExpiresAt, currentPuzzle]);

  const rewardLabel = useMemo(() => {
    const rawAmount = Number(status?.checkInAmountDisplay || 0);
    const amount = Number.isFinite(rawAmount)
      ? rawAmount
          .toFixed(4)
          .replace(/\.0+$/, "")
          .replace(/(\.\d*?)0+$/, "$1")
      : "0";
    const symbol = status?.payoutTokenSymbol || "TOKEN";
    return `${amount} ${symbol}`;
  }, [status?.checkInAmountDisplay, status?.payoutTokenSymbol]);

  const challengeShareUrl = useMemo(() => {
    const appBaseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "https://chesspuzzles.xyz";

    const url = new URL("/daily-challenge/share", appBaseUrl);
    url.searchParams.set("d", String(status?.utcDay ?? Math.floor(Date.now() / 86400000)));

    return url.toString();
  }, [status?.utcDay]);

  const buildFarcasterComposeUrl = (text: string, embedUrl: string) => {
    const url = new URL("https://farcaster.xyz/~/compose");
    url.searchParams.set("text", text);
    url.searchParams.append("embeds[]", embedUrl);
    return url.toString();
  };

  const openExternalUrl = async (url: string) => {
    if (isFarcasterMiniApp) {
      try {
        await sdk.actions.openUrl(url);
        return;
      } catch {
        // Fallback to browser navigation.
      }
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleReserveChallenge = async () => {
    if (status?.reservation?.status === "claimed") {
      setClaimMessage("You already solved today's puzzle and claimed the reward. Come back after 00:00 GMT.");
      return;
    }

    setPuzzleLoading(true);
    setClaimMessage(null);

    try {
      const result = await reserveDailyChallenge();
      setCurrentPuzzle(result.puzzle);
      setIsCompleted(false);
      setMistakeCount(0);
      setHintCount(0);
      setHintStage("none");
      setHighlightedSquares(null);
    } catch (err: any) {
      setClaimMessage(err.message || "Could not reserve daily challenge");
    } finally {
      setPuzzleLoading(false);
    }
  };

  const handlePuzzleComplete = async () => {
    if (!currentPuzzle) {
      return;
    }

    setIsCompleted(true);
    setIsSolving(true);

    try {
      const result = await solveDailyChallenge(currentPuzzle.puzzleid);
      if (result.success) {
        if (result.canClaimReward === false) {
          setClaimMessage(
            "Challenge solved. Today's reward slots are taken up, come back tomorrow."
          );
        } else {
          setClaimMessage("Challenge solved. Claim your reward on-chain.");
        }
        fireConfetti();
      }
    } catch (err: any) {
      setClaimMessage(err.message || "Failed to submit solved challenge");
    } finally {
      setIsSolving(false);
    }
  };

  const handleClaimReward = async () => {
    logClaimFlow("claim.click", {
      address,
      isOnCorrectChain,
      reservationStatus: status?.reservation?.status,
    });

    if (!isOnCorrectChain) {
      setClaimMessage("Switch to Celo network before claiming.");
      return;
    }

    setClaimMessage(null);

    try {
      await sendClaim();
      logClaimFlow("claim.tx.submitted", { address });
      setClaimMessage("Transaction sent. Waiting for confirmation...");
    } catch (err: any) {
      console.error("[ClaimFlow][DailyChallengePage] claim.error", err);

      logClaimFlow("claim.error", {
        address,
        message: err?.message,
      });
      setClaimMessage(err.message || "Failed to send claim transaction");
    }
  };

  const handleShareCast = async () => {
    const challengeRating = status?.challenge?.rating;
    const castText = challengeRating
      ? `I solved today's ${challengeRating}-rated Daily Challenge on Chess Puzzles. Can you beat it?`
      : "I solved today's Daily Challenge on Chess Puzzles. Can you beat it?";

    if (isFarcasterMiniApp) {
      try {
        const embeds: [string] = [challengeShareUrl];
        await sdk.actions.composeCast({
          text: castText,
          embeds,
        });
        return;
      } catch (error) {
        console.error("Failed to open Farcaster cast composer:", error);
      }
    }

    await openExternalUrl(buildFarcasterComposeUrl(castText, challengeShareUrl));
  };

  const handleShareTweet = async () => {
    const tweetText = `I solved today's Daily Challenge on @chesspuzzlesxyz. Can you beat it? ${challengeShareUrl}`;
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

    await openExternalUrl(twitterIntentUrl);
  };

  const handleShowHint = () => {
    if (hintStage === "none") {
      setHintStage("piece");
      const nextMove = chessBoardRef.current?.getNextMove();
      if (nextMove) {
        setHighlightedSquares({ from: nextMove.from });
      }
      return;
    }

    if (hintStage === "piece") {
      setHintStage("move");
      setHintCount((prev) => prev + 1);
      const nextMove = chessBoardRef.current?.getNextMove();
      if (nextMove) {
        setHighlightedSquares({ from: nextMove.from, to: nextMove.to });
      }
    }
  };

  const fireConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 65,
      startVelocity: 45,
      origin: { y: 0.7 },
    });

    setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 95,
        startVelocity: 35,
        origin: { x: 0.2, y: 0.75 },
      });
    }, 250);

    setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 95,
        startVelocity: 35,
        origin: { x: 0.8, y: 0.75 },
      });
    }, 350);
  };

  if (!mounted) return null;

  if (loading && !status) {
    return (
      <div className="w-screen h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen w-full bg-white text-black flex flex-col">
        <header className="pt-4 px-4 flex justify-between items-center shrink-0">
          <Link
            href="/"
            className="bg-black text-white px-2 py-1 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all"
          >
            ← BACK
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-6">
          <div className="w-full max-w-xs text-center bg-cyan-300 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] p-6 transform -rotate-1">
            <h1 className="text-xl font-black uppercase text-black mb-2">Connect Wallet</h1>
            <p className="text-sm font-bold text-black mb-4">
              Connect to reserve, solve, and share today's daily challenge.
            </p>
            <div className="flex justify-center">
              <WalletConnect />
            </div>
          </div>
        </main>
      </div>
    );
  }

  const reservationStatus = status?.reservation?.status;
  const isClaimed = reservationStatus === "claimed";
  const isAlreadySolvedToday = isClaimed;
  const canClaimReward = Boolean(status?.canClaimReward);
  const canClaim = Boolean(isCompleted) && !isClaimed && canClaimReward;
  const canShare = isClaimed;

  return (
    <div className="min-h-screen w-full bg-white text-black flex flex-col">
      <header className="pt-4 px-4 flex justify-between items-center shrink-0">
        <Link
          href="/"
          className="bg-black text-white px-2 py-1 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all"
        >
          ← BACK
        </Link>
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 font-black text-xs border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-yellow-300 text-black">
            <span className="inline-flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" /> {rewardLabel}
            </span>
          </div>
          <div className="px-3 py-2 font-black text-xs border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-cyan-300 text-black">
            SLOTS {status?.slotsRemaining ?? "--"}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-4 min-h-0">
        {!isOnCorrectChain && (
          <button
            onClick={switchToPreferredChain}
            className="bg-yellow-400 text-black px-4 py-3 font-black text-xs uppercase border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] inline-flex items-center gap-1"
          >
            <TriangleAlert className="w-4 h-4" /> Switch To Celo To Claim
          </button>
        )}

        {!currentPuzzle && (
          <div className="w-full max-w-xs text-center space-y-6">
            <div className="bg-orange-300 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform -rotate-1">
              <h1 className="text-2xl font-black text-black uppercase mb-2">Daily Challenge</h1>
              <p className="text-sm font-bold uppercase text-black">
                Solve one high-rated puzzle.
              </p>
              {status?.hasSlots && (
                <p className="text-xs font-black uppercase text-black mt-3 bg-white border-2 border-black py-1">
                  Reward: {rewardLabel}
                </p>
              )}
            </div>

            {isAlreadySolvedToday ? (
              <div className="bg-green-300 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] p-5 transform rotate-1">
                <h3 className="text-lg font-black uppercase text-black mb-2">Puzzle Already Solved</h3>
                <p className="text-sm font-bold uppercase text-black">
                  You solved today's daily challenge. Come back tomorrow.
                </p>
              </div>
            ) : (
              <>
                <button
                  onClick={handleReserveChallenge}
                  disabled={puzzleLoading}
                  className="w-full bg-green-400 text-black py-4 px-6 font-black text-lg border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                >
                  {puzzleLoading ? "RESERVING..." : "START CHALLENGE"}
                </button>

                {status && !status.hasSlots && (
                  <p className="text-xs font-black uppercase text-gray-700">
                    Today's reward slots are taken up. You can still solve for streak and stats.
                  </p>
                )}

                {status?.reservation?.rewardEligible !== false && status?.reservation?.pendingExpiresAt && (
                  <p className="text-xs font-black uppercase text-gray-700">Reservation expires in {pendingSeconds}s</p>
                )}
              </>
            )}
          </div>
        )}

        {currentPuzzle && (
          <>
            <div className="w-full max-w-xs">
              <div className="mb-3 flex justify-center">
                <div className="px-3 py-1 font-black text-xs border-2 border-black bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                  RATING {currentPuzzle.rating}
                </div>
              </div>

              <ChessBoard
                ref={chessBoardRef}
                puzzle={currentPuzzle}
                onComplete={handlePuzzleComplete}
                onWrongMove={() => setMistakeCount((prev) => prev + 1)}
                onWrongMoveStateChange={setIsWrongMoveActive}
                onHistoryChange={(back, forward) => {
                  setCanGoBack(back);
                  setCanGoForward(forward);
                }}
                onProgress={() => {
                  setHintStage("none");
                  setHighlightedSquares(null);
                }}
                highlightedSquares={highlightedSquares}
              />
            </div>

            <div className="w-full max-w-xs space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => chessBoardRef.current?.goBack()}
                  disabled={!canGoBack}
                  className={`py-2 px-4 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                    canGoBack
                      ? "bg-gray-300 text-black hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                  }`}
                >
                  ←
                </button>

                {isWrongMoveActive ? (
                  <button
                    onClick={() => chessBoardRef.current?.undoWrongMove()}
                    className="flex-1 text-black py-2 px-4 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-red-400"
                  >
                    RETRY
                  </button>
                ) : (
                  <button
                    onClick={handleShowHint}
                    disabled={hintStage === "move" || canGoForward || isCompleted}
                    className={`flex-1 text-black py-2 px-4 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                      hintStage === "move" || canGoForward || isCompleted
                        ? "bg-yellow-200 opacity-50 cursor-not-allowed"
                        : "bg-yellow-400"
                    }`}
                  >
                    {hintStage === "none"
                      ? `HINT${hintCount > 0 ? ` (${hintCount})` : ""}`
                      : hintStage === "piece"
                        ? "SHOW MOVE"
                        : "HINT SHOWN"}
                  </button>
                )}

                <button
                  onClick={() => chessBoardRef.current?.goForward()}
                  disabled={!canGoForward}
                  className={`py-2 px-4 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                    canGoForward
                      ? "bg-gray-300 text-black hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                  }`}
                >
                  →
                </button>
              </div>
            </div>
          </>
        )}

        {isSolving && (
          <div className="w-full max-w-xs bg-yellow-200 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] p-5 transform rotate-1 flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
            <h3 className="text-lg font-black uppercase text-black">Verifying...</h3>
          </div>
        )}

        {isCompleted && canClaimReward && !isSolving && (
          <div
            ref={claimCardRef}
            className="w-full max-w-xs bg-green-300 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] p-5 transform rotate-1"
          >
            <h3 className="text-xl font-black uppercase text-black mb-2">Challenge Solved</h3>
            <p className="text-sm font-bold uppercase text-black mb-4">Claim {rewardLabel} on Celo</p>

            <button
              onClick={handleClaimReward}
              disabled={!canClaim || claimSubmitting || claimConfirming || isClaimed}
              className="w-full bg-black text-green-200 py-3 px-4 font-black text-sm uppercase tracking-wide border-2 border-green-200 hover:bg-gray-800 transition-all disabled:opacity-50"
            >
              {isClaimed ? "REWARD CLAIMED" : claimSubmitting || claimConfirming ? "CLAIMING..." : "CLAIM REWARD"}
            </button>
          </div>
        )}

        {isCompleted && !canClaimReward && !isClaimed && !isSolving && (
          <div className="w-full max-w-xs bg-cyan-200 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] p-5 transform rotate-1">
            <h3 className="text-xl font-black uppercase text-black mb-2">Challenge Solved</h3>
            <p className="text-sm font-bold uppercase text-black">
              Today's reward slots are taken up. Your streak and stats still counted.
            </p>
          </div>
        )}

        {canShare && (
          <div className="w-full max-w-xs bg-cyan-300 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] p-5 transform -rotate-1 space-y-3">
            <h3 className="text-lg font-black uppercase text-black inline-flex items-center gap-2">
              <Share2 className="w-5 h-5" /> Share Daily Challenge
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => void handleShareCast()}
                className="bg-black text-cyan-200 py-2 px-3 font-black text-xs uppercase tracking-wide border-2 border-cyan-200 hover:bg-gray-800 transition-all inline-flex items-center justify-center gap-1"
              >
                <Send className="w-3.5 h-3.5" /> Share Cast
              </button>
              <button
                onClick={() => void handleShareTweet()}
                className="bg-white text-black py-2 px-3 font-black text-xs uppercase tracking-wide border-2 border-black hover:bg-gray-100 transition-all inline-flex items-center justify-center gap-1"
              >
                <AtSign className="w-3.5 h-3.5" /> Share Tweet
              </button>
            </div>
          </div>
        )}

        {(claimMessage || claimError || error) && (
          <div
            ref={statusMessageRef}
            className="w-full max-w-xs bg-white border-2 border-black p-3 text-xs font-black uppercase"
          >
            {claimMessage || claimError || error}
          </div>
        )}
      </main>
    </div>
  );
}
