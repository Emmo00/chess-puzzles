"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { ArrowUpRight, AtSign, Ban, Check, Circle, Clock, Coins, Gift, Lightbulb, Loader2, Send, Share2, X, Zap } from "lucide-react";
import { useAccount, usePublicClient } from "wagmi";
import { celo } from "wagmi/chains";

import ChessBoard, { ChessBoardRef } from "@/components/chess-board";
import { WalletConnect } from "@/components/WalletConnect";
import { PaymentModal } from "@/components/PaymentModal";
import { useCheckinClaim } from "@/lib/hooks/useCheckinClaim";
import { useDailyCheckin } from "@/lib/hooks/useDailyCheckin";
import { useUtcMidnightCountdown, formatCountdown } from "@/lib/hooks/useUtcMidnightCountdown";
import { useHintBalance } from "@/lib/hooks/useHintBalance";
import { Puzzle } from "@/lib/types";
import { TelegramSupportLink } from "@/components/TelegramSupportLink";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import { GAME_ASSETS_CONTRACT, GAME_ASSET_TYPES } from "@/lib/config/wagmi";
import { GAME_ASSETS_ABI } from "@/lib/abi/gameAssets";

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
  const [hintLoading, setHintLoading] = useState(false);
  const [hintPulse, setHintPulse] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isWrongMoveActive, setIsWrongMoveActive] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [resolvingMessage, setResolvingMessage] = useState<string | null>(null);
  const [showHintShop, setShowHintShop] = useState(false);
  const [hintShopItems, setHintShopItems] = useState<any[]>([]);
  const [hintShopLoading, setHintShopLoading] = useState(false);
  const [selectedHintItem, setSelectedHintItem] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStoreItem, setPaymentStoreItem] = useState<any>(null);
  const [paymentDefaultPrice, setPaymentDefaultPrice] = useState<string>("0.01");
  const [paymentModalKey, setPaymentModalKey] = useState(0);

  const chessBoardRef = useRef<ChessBoardRef>(null);
  const claimCardRef = useRef<HTMLDivElement>(null);
  const statusMessageRef = useRef<HTMLDivElement>(null);

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const {
    status,
    loading,
    error,
    refreshStatus,
    fetchDailyChallenge,
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

  const countdown = useUtcMidnightCountdown();
  const { hintBalance, consume: consumeHint, refresh: refreshHintBalance } = useHintBalance();

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
    if (!status?.challenge) {
      return;
    }

    const reservationStatus = status.reservation?.status;
    if (reservationStatus === "claimed") {
      setCurrentPuzzle(null);
      setIsCompleted(false);
      return;
    }

    if (status.reservation?.status === "earned" || status.reservation?.status === "claiming") {
      setCurrentPuzzle({
        puzzleid: status.challenge.puzzleId,
        fen: status.challenge.fen,
        rating: status.challenge.rating,
        ratingdeviation: status.challenge.ratingDeviation,
        moves: status.challenge.moves,
        themes: status.challenge.themes,
      });
      setIsCompleted(true);
      return;
    }

    // Only auto-set puzzle if user hasn't already manually loaded one
    const challenge = status.challenge;
    if (!challenge) return;
    setCurrentPuzzle((prev) => {
      if (prev) return prev;
      return {
        puzzleid: challenge.puzzleId,
        fen: challenge.fen,
        rating: challenge.rating,
        ratingdeviation: challenge.ratingDeviation,
        moves: challenge.moves,
        themes: challenge.themes,
      };
    });
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

  // Pulse the board wrapper continuously while a hint is showing.
  // Uses hintStage instead of a one-shot flash so the orange glow persists
  // and is impossible to miss.
  useEffect(() => {
    if (hintStage === 'none') {
      setHintPulse(false);
      return;
    }
    setHintPulse(true);
    const id = window.setInterval(() => setHintPulse((v) => !v), 500);
    return () => window.clearInterval(id);
  }, [hintStage]);

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

  const displayTxHash = status?.reservation?.claimTxHash || txHash;


  const openExternalUrl = async (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleStartChallenge = async () => {
    if (status?.reservation?.status === "claimed") {
      setClaimMessage("You already solved today's puzzle and claimed the reward. Come back after 00:00 GMT.");
      return;
    }

    setPuzzleLoading(true);
    setResolvingMessage(null);
    setClaimMessage(null);

    try {
      const result = await fetchDailyChallenge();
      setCurrentPuzzle(result.puzzle);
      setIsCompleted(false);
      setMistakeCount(0);
      setHintCount(0);
      setHintStage("none");
      setHighlightedSquares(null);
    } catch (err: any) {
      setClaimMessage(err.message || "Could not load daily challenge");
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
    setResolvingMessage(null);

    try {
      const result = await solveDailyChallenge(currentPuzzle.puzzleid);
      if (result.success) {
        if (result.canClaimReward) {
          setResolvingMessage("Reward slot secured! Checking claim eligibility...");
          setClaimMessage("Challenge solved! Claim your reward on-chain.");
          logClaimFlow("puzzle.complete.rewardEligible", { walletAddress: address });
        } else {
          setClaimMessage(
            "Challenge solved! Today's reward slots are already taken — your score and streak still count."
          );
          logClaimFlow("puzzle.complete.noSlot", { walletAddress: address });
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
      reservationStatus: status?.reservation?.status,
    });

    if (!status?.reservation?.rewardEligible) {
      setClaimMessage("Today's reward slots are already taken. You can still solve for streak and stats.");
      return;
    }

    setClaimMessage(null);

    try {
      await sendClaim();
      logClaimFlow("claim.tx.submitted", { address });
      setClaimMessage("Transaction sent. Waiting for confirmation...");
    } catch (err: any) {
      console.error("[ClaimFlow][DailyChallengePage] claim.error", err);

      const msg = err?.shortMessage || err?.message || "Failed to send claim transaction";
      logClaimFlow("claim.error", {
        address,
        message: msg,
      });
      setClaimMessage(msg);
    }
  };

  const handleShareCast = async () => {
    const challengeRating = status?.challenge?.rating;
    const castText = challengeRating
      ? `I solved today's ${challengeRating}-rated Daily Challenge on Chess Puzzles. Can you beat it?`
      : "I solved today's Daily Challenge on Chess Puzzles. Can you beat it?";

    const url = new URL("https://farcaster.xyz/~/compose");
    url.searchParams.set("text", castText);
    url.searchParams.append("embeds[]", challengeShareUrl);

    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  const handleShareTweet = async () => {
    const tweetText = `I solved today's Daily Challenge on @chesspuzzlesxyz. Can you beat it? ${challengeShareUrl}`;
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

    await openExternalUrl(twitterIntentUrl);
  };

  const handleShowHint = async () => {
    if (hintLoading) return;

    if (hintBalance <= 0) {
      setHintLoading(true);
      setHintShopLoading(true);
      setShowHintShop(true);
      try {
        if (!GAME_ASSETS_CONTRACT || !publicClient) {
          setHintShopItems([]);
          return;
        }
        const [hintUnit, count] = await Promise.all([
          publicClient.readContract({
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: "unitPrices",
            args: [GAME_ASSET_TYPES.HINT],
          }),
          publicClient.readContract({
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: "getAssetPackCount",
          }),
        ]);
        const items: any[] = [];
        if (Number(hintUnit) > 0) {
          items.push({
            id: "hint-unit",
            name: "1 Hint",
            category: "hints",
            priceUsd: (Number(hintUnit) / 1_000_000).toFixed(2),
            quantity: 1,
          });
        }
        for (let i = 0; i < Number(count); i++) {
          const pack = await publicClient.readContract({
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: "getAssetPack",
            args: [BigInt(i)],
          }) as any;
          if (pack.active && String(pack.assetType).toLowerCase() === String(GAME_ASSET_TYPES.HINT).toLowerCase()) {
            items.push({
              id: `pack-${i}`,
              name: pack.name,
              category: "hints",
              priceUsd: (Number(pack.price) / 1_000_000).toFixed(2),
              quantity: Number(pack.quantity),
              packId: i,
            });
          }
        }
        setHintShopItems(items);
      } catch {
        setHintShopItems([]);
      } finally {
        setHintLoading(false);
        setHintShopLoading(false);
      }
      return;
    }

    // Pre-check: avoid showing an optimistic hint that's doomed to fail.
    if (hintBalance <= 0) {
      toast.error("Out of hints", { description: "Buy more in the Store." });
      return;
    }

    // Snapshot state so a failed background consume can be rolled back.
    const prevStage = hintStage;
    const prevHighlighted = highlightedSquares;
    const prevHintCount = hintCount;

    const targetStage: HintStage = hintStage === "none" ? "piece" : "move";
    const nextMove = chessBoardRef.current?.getNextMove();

    // Reveal immediately — no network wait.
    setHintLoading(true);
    setHintStage(targetStage);
    setHintCount((c) => c + 1);
    if (nextMove) {
      setHighlightedSquares(
        targetStage === "piece"
          ? { from: nextMove.from }
          : { from: nextMove.from, to: nextMove.to }
      );
    }

    // Consume in the background. Roll back ONLY on failure.
    try {
      const ok = await consumeHint();
      if (!ok) throw new Error("consume failed");
    } catch {
      setHintStage(prevStage);
      setHighlightedSquares(prevHighlighted);
      setHintCount(prevHintCount);
      toast.error("Hint couldn't be confirmed", {
        description: "That hint was reverted — please try again.",
      });
    } finally {
      setHintLoading(false);
    }
  };

  const handleBuyHintItem = (item: any) => {
    setSelectedHintItem(item);
    setPaymentStoreItem(item);
    setPaymentModalKey((k) => k + 1);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setPaymentStoreItem(null);
    setSelectedHintItem(null);
    refreshHintBalance();
    if (showHintShop) {
      setShowHintShop(false);
    }
    toast.success("Purchase complete!");
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
      <div className="h-dvh w-full app-paper-bg text-black flex flex-col overflow-hidden items-center justify-center">
        <div className="bg-yellow-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-black mx-auto mb-3"></div>
          <p className="text-lg font-black text-black">LOADING...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="h-dvh w-full app-paper-bg text-black flex flex-col overflow-hidden">
        <header className="pt-4 px-4 flex justify-between items-center shrink-0">
          <Link
            href="/"
            className="bg-black text-white px-2 py-1 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all"
          >
            ← BACK
          </Link>
          <div className="px-3 py-2 font-black text-sm border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-yellow-300 text-black">
            DAILY
          </div>
        </header>

        <main className="flex-1 overflow-y-auto flex items-center justify-center px-4 py-6">
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

        <BottomNav />
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
    <div className="h-dvh w-full app-paper-bg text-black flex flex-col overflow-hidden">
      <header className="pt-4 px-4 flex justify-between items-center shrink-0">
        <Link
          href="/"
          className="bg-black text-white px-2 py-1 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all"
        >
          ← BACK
        </Link>
        <div className="px-4 py-2 font-black text-sm border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-yellow-400 text-black">
          <span className="inline-flex items-center gap-1">
            <Zap className="w-4 h-4" /> DAILY #{((status?.utcDay ?? 0) - 20660).toString()}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto flex flex-col lg:flex-row items-center lg:items-start justify-center px-4 py-6 gap-6 min-h-0">
        {isAlreadySolvedToday && (
          <div className="w-full max-w-md bg-yellow-300 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 text-center">
            <div className="font-black text-sm uppercase text-black">You solved today&apos;s challenge!</div>
          </div>
        )}

        {!currentPuzzle && (
          <div className="w-full max-w-xs text-center space-y-6">
            {isAlreadySolvedToday && (
              <div className="bg-green-300 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-5 transform rotate-1">
                <h3 className="text-lg font-black uppercase text-black mb-2">Already Solved</h3>
                <p className="text-sm font-bold uppercase text-black">
                  You solved today's challenge. Next puzzle in {formatCountdown(countdown)}.
                </p>
              </div>
            )}
            {!isAlreadySolvedToday && puzzleLoading && (
              <div className="bg-yellow-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-black mx-auto mb-3"></div>
                <p className="text-lg font-black text-black">LOADING PUZZLE...</p>
              </div>
            )}
            {!isAlreadySolvedToday && !puzzleLoading && (
              <>
                <div className="bg-yellow-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform -rotate-1">
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
                <button
                  onClick={handleStartChallenge}
                  className="w-full bg-green-400 text-black py-4 px-6 font-black text-lg border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
                >
                  START CHALLENGE
                </button>
                {status && !status.hasSlots && (
                  <p className="text-xs font-black uppercase text-gray-700">
                    Today's reward slots are taken up. You can still solve for streak and stats.
                  </p>
                )}
                {(resolvingMessage || (status?.reservation?.rewardEligible !== false && status?.reservation?.pendingExpiresAt)) && (
                  <p className="text-xs font-black uppercase text-gray-700">{resolvingMessage || `Reservation expires in ${pendingSeconds}s`}</p>
                )}
              </>
            )}
          </div>
        )}

        {currentPuzzle && (
          <>
            <div className="flex-1 w-full flex flex-col items-center">
              {/* Turn Indicator */}
              <div className="mb-3 text-center">
                <div
                  className={`inline-block px-4 py-2 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    status?.challenge?.moves && currentPuzzle.moves?.length
                      ? currentPuzzle.moves[currentPuzzle.moves.length - 1]?.includes("...") || (currentPuzzle.moves.length % 2 === 0 && currentPuzzle.moves.length > 0)
                        ? "bg-white text-black"
                        : "bg-gray-800 text-white"
                      : "bg-white text-black"
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    <Circle className="w-3.5 h-3.5" /> WHITE TO MOVE
                  </span>
                </div>
              </div>

              {/* Theme tags */}
              {currentPuzzle.themes.length > 0 && (
                <div className="mb-3 flex flex-wrap justify-center gap-1.5">
                  {currentPuzzle.themes.slice(0, 5).map((themeId) => (
                    <span
                      key={themeId}
                      className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black bg-lime-300 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      {themeId}
                    </span>
                  ))}
                  {currentPuzzle.themes.length > 5 && (
                    <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      +{currentPuzzle.themes.length - 5}
                    </span>
                  )}
                </div>
              )}

              {/* Board */}
              <div className={`w-full max-w-[560px] aspect-square transition-shadow duration-300 ${
                hintPulse ? 'shadow-[0_0_0_5px_rgba(255,120,0,0.9)]' : ''
              }`}>
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
            </div>

            <div className="w-full lg:w-80 shrink-0 space-y-3">
              {/* Navigation Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => chessBoardRef.current?.goBack()}
                  disabled={!canGoBack}
                  className={`py-2 px-4 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                    canGoBack
                      ? "bg-gray-300 text-black hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                  }`}
                >
                  ← BACK
                </button>

                {isWrongMoveActive ? (
                  <button
                    onClick={() => chessBoardRef.current?.undoWrongMove()}
                    className="flex-1 text-black py-2 px-4 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all animate-in fade-in duration-200 bg-red-400"
                  >
                    RETRY
                  </button>
                ) : (
                  <div className="flex-1" />
                )}

                <button
                  onClick={() => chessBoardRef.current?.goForward()}
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

              {/* Full-width Hint Button (animated collapse on wrong move) */}
              {!isCompleted && (
                <div className={`overflow-hidden transition-all duration-300 ${
                  isWrongMoveActive ? 'max-h-0 opacity-0' : 'max-h-28 opacity-100'
                }`}>
                  {/* Persistent hint-active indicator */}
                  {hintStage !== 'none' && (
                    <div className="bg-orange-300 border-2 border-black px-3 py-2 font-black text-xs uppercase text-center inline-flex items-center gap-1.5 justify-center w-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-2 animate-in fade-in duration-200">
                      <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                      {hintStage === 'piece'
                        ? "Hint active — piece to move is highlighted"
                        : "Hint active — full move is shown"}
                    </div>
                  )}

                  {hintStage !== 'move' ? (
                    <button
                      onClick={handleShowHint}
                      disabled={hintLoading}
                      className={`w-full text-black py-3 px-4 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-yellow-400 inline-flex items-center justify-center gap-2 ${
                        hintLoading
                          ? "opacity-60 cursor-wait"
                          : "hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px"
                      }`}
                    >
                      {hintLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Showing…</span>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="w-full text-black py-3 px-4 font-black text-xs border-2 border-black bg-yellow-200 inline-flex items-center justify-center gap-2 opacity-60">
                      <Check className="w-4 h-4" /> HINT SHOWN
                    </div>
                  )}
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

        {isSolving && (
          <div className="w-full max-w-xs bg-yellow-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-5 flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-4 border-black"></div>
            <p className="text-lg font-black text-black">VERIFYING...</p>
          </div>
        )}

        {isCompleted && canClaimReward && !isSolving && (
          <div
            ref={claimCardRef}
            className="w-full max-w-xs bg-green-300 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-5 transform rotate-1"
          >
            <h3 className="text-xl font-black uppercase text-black mb-2 inline-flex items-center gap-2">
              <Coins className="w-5 h-5" /> Challenge Solved
            </h3>
            <p className="text-sm font-bold uppercase text-black mb-4">Claim {rewardLabel} on Celo</p>

            <button
              onClick={handleClaimReward}
              disabled={!canClaim || claimSubmitting || claimConfirming || isClaimed}
              className="w-full bg-black text-green-200 py-3 px-4 font-black text-sm uppercase tracking-wide border-2 border-green-200 hover:bg-gray-800 transition-all disabled:opacity-50"
            >
              {isClaimed ? "REWARD CLAIMED" : claimSubmitting || claimConfirming ? "CLAIMING..." : "CLAIM REWARD"}
            </button>

            {isClaimed && displayTxHash && (
              <button
                onClick={() => void openExternalUrl(`${celo.blockExplorers.default.url}/tx/${displayTxHash}`)}
                className="mt-3 w-full flex items-center justify-center gap-1 text-black font-black text-xs uppercase hover:underline decoration-2 underline-offset-2"
              >
                View Transaction <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {isCompleted && !canClaimReward && !isClaimed && !isSolving && (
          <div className="w-full max-w-xs bg-cyan-200 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-5 transform rotate-1">
            <h3 className="text-lg font-black uppercase text-black mb-2">Challenge Solved</h3>
            <p className="text-sm font-bold uppercase text-black">
              Today's reward quota has been exhausted. Your score and streak still count.
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
            className="w-full max-w-xs bg-white border-2 border-black p-3 text-xs font-black uppercase flex flex-col"
          >
            <div className="flex-1">{claimMessage || claimError || error}</div>
            {displayTxHash && (
              <button
                onClick={() => void openExternalUrl(`${celo.blockExplorers.default.url}/tx/${displayTxHash}`)}
                className="mt-2 flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors lowercase font-bold border-t border-black/10 pt-2"
              >
                view transaction <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
            <TelegramSupportLink />
          </div>
        )}
      </main>

      <BottomNav />

      {/* Hint Shop Modal */}
      {showHintShop && (
        <div className="fixed inset-0 z-50 p-4 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowHintShop(false)} />
          <div className="relative bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] max-w-sm w-full">
            <div className="bg-yellow-400 border-b-4 border-black p-4">
              <div className="flex justify-between items-center">
                <h2 className="font-black text-lg uppercase text-black flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" /> BUY HINTS
                </h2>
                <button
                  onClick={() => setShowHintShop(false)}
                  className="w-7 h-7 bg-red-500 border-2 border-black text-black flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {hintShopLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : hintShopItems.length === 0 ? (
                <p className="text-xs font-bold text-center uppercase text-gray-500 py-4">No hint packs available</p>
              ) : (
                hintShopItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="bg-cyan-200 border-2 border-black p-3 flex items-center gap-3"
                  >
                    <Gift className="w-5 h-5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-sm uppercase truncate">{item.name}</div>
                      <div className="text-[10px] font-bold text-black/70 truncate">
                        ×{item.quantity}
                      </div>
                    </div>
                    <button
                      onClick={() => handleBuyHintItem(item)}
                      className="bg-black text-white px-3 py-1.5 text-xs font-black uppercase border-2 border-black shrink-0"
                    >
                      ${item.priceUsd}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        key={paymentModalKey}
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setPaymentStoreItem(null);
          setSelectedHintItem(null);
        }}
        onSuccess={handlePaymentSuccess}
        storeItem={paymentStoreItem}
        defaultPriceUsd={paymentDefaultPrice}
      />
    </div>
  );
}
