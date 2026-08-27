"use client";

import { Coins, Flame } from "lucide-react";
import styles from "@/app/page.module.css";
import { levelProgressPercent } from "@/lib/leveling";

interface PointsStreakPillProps {
  points: number;
  streak: number;
}

function formatPoints(points: number): string {
  return Math.max(0, Math.floor(points)).toLocaleString("en-US");
}

export function PointsStreakPill({ points, streak }: PointsStreakPillProps) {
  const progress = Math.max(0, Math.min(100, levelProgressPercent(points)));

  return (
    <div className={styles.pointsPill} aria-label={`Points ${formatPoints(points)}, streak ${streak}`}>
      <div className={styles.pillStatsRow}>
        <span className={`${styles.pillStat} ${styles.coinIcon}`}>
          <Coins strokeWidth={3} aria-hidden="true" />
          {formatPoints(points)}
        </span>
        <span className={`${styles.pillStat} ${styles.streakIcon}`}>
          <Flame strokeWidth={3} fill="currentColor" aria-hidden="true" />
          {streak}
        </span>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={styles.progressFill}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
