"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { List, Puzzle } from "lucide-react";
import { WalletConnect } from "@/components/WalletConnect";
import { BottomNav } from "@/components/BottomNav";
import { ModeSheet } from "@/components/home/ModeSheet";
import { AvatarBubble } from "@/components/home/AvatarBubble";
import { PointsStreakPill } from "@/components/home/PointsStreakPill";
import { ProgressMap } from "@/components/home/ProgressMap";
import { LevelDetailsModal, type LevelModalData } from "@/components/home/LevelDetailsModal";
import { useUserStats } from "@/lib/hooks/useUserStats";
import { useDailyCheckin } from "@/lib/hooks/useDailyCheckin";
import { levelForPoints, pointsForLevel, levelProgressPercent, levelStateFor } from "@/lib/leveling";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { userStats } = useUserStats();
  const { status: checkInStatus } = useDailyCheckin();
  const dailySolved = checkInStatus?.reservation?.status === "claimed";

  const points = Math.max(0, Math.floor(userStats?.points ?? 0));
  const streak = Math.max(0, Math.floor(userStats?.currentStreak ?? 0));
  const level = useMemo(() => levelForPoints(points), [points]);

  const [mounted, setMounted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [currentNodeInView, setCurrentNodeInView] = useState(true);
  const [modalLevel, setModalLevel] = useState<number | null>(null);

  const currentNodeRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    </div>
  );
}
