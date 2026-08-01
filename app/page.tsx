"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { List, Puzzle, ShoppingCart, Snowflake, X, Volume2, VolumeX } from "lucide-react";
import { WalletConnect } from "@/components/WalletConnect";
import { BottomNav } from "@/components/BottomNav";
import { ModeSheet } from "@/components/home/ModeSheet";
import { AvatarBubble } from "@/components/home/AvatarBubble";
import { PointsStreakPill } from "@/components/home/PointsStreakPill";
import { ProgressMap } from "@/components/home/ProgressMap";
import { LevelDetailsModal, type LevelModalData } from "@/components/home/LevelDetailsModal";
import { useUserStats } from "@/lib/hooks/useUserStats";
import type { StreakStatus } from "@/lib/hooks/useUserStats";
import { useDailyCheckin } from "@/lib/hooks/useDailyCheckin";
import { levelForPoints, pointsForLevel, levelProgressPercent, levelStateFor } from "@/lib/leveling";
import {
  isMusicEnabled,
  MUSIC_PREF_EVENT,
  setMusicEnabled as persistMusicEnabled,
} from "@/lib/utils/backgroundMusic";
import { fireLevelUpConfetti, LEVEL_TRACKING_KEY } from "@/lib/utils/levelUpConfetti";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { userStats } = useUserStats();
  const { status: checkInStatus } = useDailyCheckin();
  const dailySolved = checkInStatus?.reservation?.status === "claimed";

  const points = Math.max(0, Math.floor(userStats?.points ?? 0));
  const streak = Math.max(0, Math.floor(userStats?.currentStreak ?? 0));
  const streakStatus: StreakStatus = userStats?.streakStatus ?? "alive";
  const level = useMemo(() => levelForPoints(points), [points]);

  const [mounted, setMounted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [currentNodeInView, setCurrentNodeInView] = useState(true);
  const [modalLevel, setModalLevel] = useState<number | null>(null);
  const [streakPopupDismissed, setStreakPopupDismissed] = useState(false);
  const [musicEnabled, setMusicEnabledState] = useState(true);

  const showStreakPopup = streakStatus !== "alive" && !streakPopupDismissed && isConnected;

  const currentNodeRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setMusicEnabledState(isMusicEnabled());

    const syncPreference = () => {
      setMusicEnabledState(isMusicEnabled());
    };

    window.addEventListener(MUSIC_PREF_EVENT, syncPreference);
    window.addEventListener("storage", syncPreference);
    return () => {
      window.removeEventListener(MUSIC_PREF_EVENT, syncPreference);
      window.removeEventListener("storage", syncPreference);
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !userStats) return;

    const storedRaw = localStorage.getItem(LEVEL_TRACKING_KEY);
    if (storedRaw === null) {
      localStorage.setItem(LEVEL_TRACKING_KEY, String(level));
      return;
    }

    const stored = Number(storedRaw);
    if (level > stored) {
      fireLevelUpConfetti();
    }
    localStorage.setItem(LEVEL_TRACKING_KEY, String(level));
  }, [mounted, userStats, level]);

  useEffect(() => {
    if (!mounted) return;
    const node = currentNodeRef.current;
    const root = scrollContainerRef.current;
    if (!node || !root) return;

    let rawInView = true;
    let settleTimer: number | undefined;
    let isScrolling = false;

    const commit = () => {
      setCurrentNodeInView(rawInView);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          rawInView = entry.isIntersecting;
        }
        if (!isScrolling) {
          if (settleTimer) window.clearTimeout(settleTimer);
          settleTimer = window.setTimeout(commit, 180);
        }
      },
      { root, threshold: 0.25 }
    );

    observer.observe(node);

    const handleScroll = () => {
      isScrolling = true;
      if (settleTimer) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        isScrolling = false;
        commit();
      }, 180);
    };

    root.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      root.removeEventListener("scroll", handleScroll);
      if (settleTimer) window.clearTimeout(settleTimer);
    };
  }, [mounted, points]);

  useEffect(() => {
    if (!mounted) return;
    const node = currentNodeRef.current;
    const root = scrollContainerRef.current;
    if (!node || !root) return;
    const timer = window.setTimeout(() => {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [mounted, points]);

  const handleSolve = useCallback(() => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }
    router.push("/solve-puzzles");
  }, [isConnected, router]);

  const toggleMusic = useCallback(() => {
    setMusicEnabledState((prev) => {
      const next = !prev;
      persistMusicEnabled(next);
      return next;
    });
  }, []);

  const handleLevelClick = useCallback((clickedLevel: number) => {
    setModalLevel(clickedLevel);
  }, []);

  const modalData: LevelModalData | null =
    modalLevel !== null
      ? {
          level: modalLevel,
          state: levelStateFor(modalLevel, level),
          currentLevel: level,
          progressPercent: levelProgressPercent(points),
          pointsToGo: Math.max(0, pointsForLevel(level + 1) - points),
          points,
        }
      : null;

  if (!mounted) return null;

  const bubbleVisible = currentNodeInView && !sheetOpen;

  return (
    <div className={styles.page}>
      <AvatarBubble
        visible={bubbleVisible}
        streak={streak}
        streakStatus={streakStatus}
        level={level}
        name={userStats?.displayName}
      />

      <div className={styles.topSection}>
        <header className={styles.homeHeader}>
          <WalletConnect />
        </header>

        <PointsStreakPill points={points} streak={streak} />
      </div>

      <ProgressMap
        points={points}
        currentNodeRef={currentNodeRef}
        scrollContainerRef={scrollContainerRef}
        onStart={handleSolve}
        onLevelClick={handleLevelClick}
      />

      <div className={styles.bottomSection}>
        <div className={styles.ctaRow}>
          <button
            type="button"
            className={styles.musicToggle}
            onClick={toggleMusic}
            aria-label={musicEnabled ? "Mute background music" : "Unmute background music"}
            aria-pressed={musicEnabled}
          >
            {musicEnabled ? (
              <Volume2 strokeWidth={3.5} aria-hidden="true" />
            ) : (
              <VolumeX strokeWidth={3.5} aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setSheetOpen(true)}
            aria-label="Open puzzle modes"
          >
            <List strokeWidth={3.5} aria-hidden="true" />
          </button>
          <button type="button" className={styles.solveCta} onClick={handleSolve}>
            <Puzzle strokeWidth={3.5} aria-hidden="true" />
            Solve Puzzles
          </button>
        </div>
      </div>

      <BottomNav />

      <ModeSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        dailySolved={dailySolved}
      />

      <LevelDetailsModal
        data={modalData}
        onClose={() => setModalLevel(null)}
        onSolve={handleSolve}
      />

      {/* Streak awareness popup — at_risk / broken */}
      {showStreakPopup && (streakStatus === "at_risk" || streakStatus === "broken") && (
        <div className="fixed inset-0 z-50 p-4 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80" onClick={() => setStreakPopupDismissed(true)} />
          <div className="relative bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] max-w-sm w-full">
            <div className={`${streakStatus === "at_risk" ? "bg-orange-400" : "bg-red-400"} border-b-4 border-black p-4 flex justify-between items-center`}>
              <h2 className="font-black text-lg uppercase text-black inline-flex items-center gap-2">
                <Snowflake className="w-6 h-6" />
                {streakStatus === "at_risk" ? "Streak at Risk!" : "Streak Ended"}
              </h2>
              <button
                onClick={() => setStreakPopupDismissed(true)}
                className="w-7 h-7 bg-red-500 border-2 border-black text-black flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className={streakStatus === "at_risk" ? "bg-orange-100 p-5 space-y-3" : "bg-red-100 p-5 space-y-3"}>
              {streakStatus === "at_risk" ? (
                <>
                  <p className="font-bold text-sm text-black">
                    You missed a day! Your <span className="font-black">{streak}-day streak</span> is at risk.
                    Solve a puzzle now and a Streak Freeze will protect it automatically.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setStreakPopupDismissed(true); router.push("/solve-puzzles"); }}
                    className="w-full bg-black text-white py-3 font-black text-sm uppercase tracking-wide border-2 border-black hover:bg-gray-800 transition-all inline-flex items-center justify-center gap-2"
                  >
                    <Puzzle className="w-4 h-4" /> Solve Now
                  </button>
                </>
              ) : (
                <>
                  <p className="font-bold text-sm text-black">
                    You missed a day and didn&apos;t have a Streak Freeze available.
                  </p>
                  <p className="text-xs font-bold text-black/70">
                    Get a Streak Freeze so you&apos;re protected the next time you miss a day.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setStreakPopupDismissed(true); router.push("/store"); }}
                    className="w-full bg-black text-white py-3 font-black text-sm uppercase tracking-wide border-2 border-black hover:bg-gray-800 transition-all inline-flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" /> Get Streak Freeze
                  </button>
                </>
              )}

              <button
                onClick={() => setStreakPopupDismissed(true)}
                className="w-full text-center text-xs font-bold text-black/50 hover:text-black transition-colors uppercase"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
