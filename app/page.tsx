"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import ChessPiecesScene from "../components/chess-pieces-scene";
import StreakBadge from "../components/streak-badge";
import CTABlock from "../components/cta-block";
import { WalletConnect } from "@/components/WalletConnect";
import { PaymentModal } from "@/components/PaymentModal";
import { StreakModal } from "@/components/StreakModal";
import { PuzzlesActionModal } from "@/components/PuzzlesActionModal";
import { useUserStats } from "../lib/hooks/useUserStats";
import { useStreak } from "../lib/hooks/useStreak";
import { useDailyCheckin } from "@/lib/hooks/useDailyCheckin";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showPuzzlesModal, setShowPuzzlesModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<{
    hasAccess: boolean;
    hasDailyAccess: boolean;
  } | null>(null);
  const { address, isConnected } = useAccount();
  const { userStats } = useUserStats();
  const { streakData, isLoading: streakLoading } = useStreak();
  const { status: checkInStatus, refreshStatus: refreshCheckInStatus } = useDailyCheckin();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check payment status when wallet connects
  useEffect(() => {
    if (address && isConnected) {
      checkPaymentStatus();
    }
  }, [address, isConnected]);

  const checkPaymentStatus = async () => {
    try {
      const response = await fetch(`/api/payments/status?walletAddress=${address}`);
      if (response.ok) {
        const status = await response.json();
        setPaymentStatus(status);
      }
    } catch (error) {
      console.error("Failed to check payment status:", error);
    }
  };

  const handlePaymentSuccess = () => {
    checkPaymentStatus(); // Refresh payment status
  };

  const handleOpenPuzzles = () => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    refreshCheckInStatus();
    setShowPuzzlesModal(true);
  };

  const handleStreakClick = () => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }
    setShowStreakModal(true);
  };

  if (!mounted) return null;

  // Determine access status
  const hasAccess = paymentStatus?.hasAccess;
  const reservationStatus = checkInStatus?.reservation?.status;
  const showEarlyBadge =
    Boolean(isConnected) &&
    Boolean(checkInStatus?.hasSlots) &&
    (!reservationStatus || reservationStatus === "expired" || reservationStatus === "failed");

  const ctaBlocks = [
    {
      id: 1,
      title: "Puzzles",
      subtitle: "Daily + Classic",
      ribbonText: "Earn cash",
      accentColor: hasAccess ? "bg-green-400" : "bg-cyan-400",
      icon: "▲",
      onClick: handleOpenPuzzles,
    },
    {
      id: 3,
      title: "Leaderboard",
      subtitle: "Top Players",
      accentColor: "bg-purple-400",
      icon: "★",
      href: "/leaderboard",
    },
    {
      id: 4,
      title: "Settings",
      subtitle: "Rating Range, Themes",
      accentColor: "bg-lime-400",
      icon: "⚙",
      href: "/settings",
    },
    {
      id: 5,
      title: "FAQ",
      subtitle: "How It Works",
      accentColor: "bg-yellow-400",
      icon: "?",
      href: "/faq",
    },
  ];

  return (
    <div className="relative w-full h-screen bg-gray-50 text-black overflow-hidden font-sans selection:bg-orange-100 flex flex-col">
      {/* Background 3D Scene */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <ChessPiecesScene />
      </div>

      {/* Foreground Content */}
      <div className="relative z-10 flex flex-col h-full pointer-events-none">
        {/* Header with Streak Badge and Wallet */}
        <header className="pt-6 px-6 flex justify-between items-center shrink-0 pointer-events-auto gap-3">
          <WalletConnect />
          <div className="flex items-center gap-3">
            <StreakBadge
              days={streakData?.currentStreak || userStats?.currentStreak || 0}
              onClick={handleStreakClick}
            />
          </div>
        </header>

        {/* Main Content - Centered, No Scroll */}
        <main className="flex-1 flex flex-col items-center px-4 overflow-hidden w-full max-w-md mx-auto">
          {/* Headline */}
          <div className="mt-12 mb-auto flex flex-col items-center justify-center">
            <h1 className="text-5xl md:text-6xl font-black text-center leading-[1.1] text-gray-900 tracking-tight drop-shadow-sm">
              Be the King of{" "}
              <span className="text-orange-400 bg-black px-2 inline-block transform -rotate-2 shadow-lg">
                Chess
              </span>
            </h1>
          </div>

          {/* 4 CTA Blocks - Responsive Grid */}
          <div className="w-full grid grid-cols-2 gap-2 mb-4 pointer-events-auto pb-8 px-4">
            {ctaBlocks.map((cta) => (
              <CTABlock
                key={cta.id}
                title={cta.title}
                subtitle={cta.subtitle}
                accentColor={cta.accentColor}
                icon={cta.icon}
                ribbonText={cta.ribbonText}
                href={cta.href}
                onClick={cta.onClick}
              />
            ))}
          </div>
        </main>

        <PuzzlesActionModal
          isOpen={showPuzzlesModal}
          onClose={() => setShowPuzzlesModal(false)}
          checkInAmountDisplay={checkInStatus?.checkInAmountDisplay}
          checkInTokenSymbol={checkInStatus?.payoutTokenSymbol}
          maxDailyCheckIns={checkInStatus?.maxDailyCheckIns}
        />

        {/* Payment Modal */}
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />

        {/* Streak Modal */}
        <StreakModal
          isOpen={showStreakModal}
          onClose={() => setShowStreakModal(false)}
          userStats={streakData || null}
        />
      </div>
    </div>
  );
}
