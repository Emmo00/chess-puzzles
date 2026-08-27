"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, Gauge, Puzzle, X } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import styles from "@/app/page.module.css";
import {
  useUtcMidnightCountdown,
  formatCountdown,
} from "@/lib/hooks/useUtcMidnightCountdown";

interface ModeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  dailySolved?: boolean;
}

type Option = {
  label: string;
  sub: string;
  icon: typeof CalendarDays;
  background: string;
  onSelect: () => void;
};

export function ModeSheet({ isOpen, onClose, dailySolved }: ModeSheetProps) {
  const router = useRouter();
  const countdown = useUtcMidnightCountdown();

  if (!isOpen) return null;

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const dailySub = dailySolved
    ? `Solved! Next in ${formatCountdown(countdown)}`
    : "Today's shared puzzle";

  const options: Option[] = [
    {
      label: "Daily Puzzle",
      sub: dailySub,
      icon: CalendarDays,
      background: "var(--yellow)",
      onSelect: () => go("/daily-challenge"),
    },
    {
      label: "Puzzle Rush",
      sub: "Score fast across modes",
      icon: Gauge,
      background: "var(--cyan)",
      onSelect: () => go("/puzzle-rush"),
    },
    {
      label: "Solve Puzzles",
      sub: "Endless tactical practice",
      icon: Puzzle,
      background: "var(--lime)",
      onSelect: () => go("/solve-puzzles"),
    },
    /*
    {
      label: "Puzzle Battle",
      sub: "Coming soon",
      icon: Swords,
      background: "var(--coral)",
      onSelect: () => go("/coming-soon"),
    },
    {
      label: "Custom",
      sub: "Pick rating range & themes",
      icon: SlidersHorizontal,
      background: "var(--lime)",
      onSelect: () => go("/settings"),
    },
    */
  ];

  return (
    <div
      className={styles.modeSheetBackdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Choose puzzle mode"
    >
      <div
        className={styles.modeSheet}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modeSheetHandle} />
        <div className={styles.modeSheetTitle}>Choose a mode</div>

        {options.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.label}
              type="button"
              onClick={option.onSelect}
              className={styles.modeSheetOption}
              style={{ background: option.background }}
            >
              <span className={styles.optIcon}>
                <Icon strokeWidth={3} aria-hidden="true" />
              </span>
              <span>
                {option.label}
                <span className={styles.optSub}>{option.sub}</span>
              </span>
            </button>
          );
        })}

        <div className={styles.modeSheetCloseRow}>
          <button
            type="button"
            onClick={onClose}
            className={styles.modeSheetCloseBtn}
            aria-label="Close mode menu"
          >
            <X strokeWidth={3.5} aria-hidden="true" />
          </button>
        </div>

        <SiteFooter />
      </div>
    </div>
  );
}
