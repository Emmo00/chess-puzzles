"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingCart, Puzzle } from "lucide-react";
import styles from "@/app/page.module.css";

interface AvatarBubbleProps {
  visible: boolean;
  streak: number;
  streakStatus: "alive" | "at_risk" | "broken";
  level: number;
  name?: string;
}

export function AvatarBubble({ visible, streak, streakStatus, level, name }: AvatarBubbleProps) {
  const router = useRouter();

  if (streakStatus === "at_risk") {
    return (
      <div
        className={`${styles.welcomeBubble} ${visible ? "" : styles.hidden}`}
        aria-hidden={!visible}
      >
        <Image
          src="/welcome-sprite.png"
          alt="Welcome guide"
          width={58}
          height={58}
          className={styles.avatarImg}
          priority
        />
        <div>
          <div className={styles.speechBubble}>
            {name ? `${name}, y` : "Y"}our {streak}-day streak is at risk! Solve a puzzle now to keep it alive.
          </div>
          <button
            type="button"
            onClick={() => router.push("/solve-puzzles")}
            className="mt-1.5 bg-black text-white px-3 py-1.5 text-xs font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all inline-flex items-center gap-1.5"
          >
            <Puzzle className="w-3.5 h-3.5" /> Solve Now
          </button>
        </div>
      </div>
    );
  }

  if (streakStatus === "broken") {
    return (
      <div
        className={`${styles.welcomeBubble} ${visible ? "" : styles.hidden}`}
        aria-hidden={!visible}
      >
        <Image
          src="/welcome-sprite.png"
          alt="Welcome guide"
          width={58}
          height={58}
          className={styles.avatarImg}
          priority
        />
        <div>
          <div className={styles.speechBubble}>
            {name ? `${name}, y` : "Y"}our streak ended. Get a Streak Freeze so you&apos;re protected next time.
          </div>
          <button
            type="button"
            onClick={() => router.push("/store")}
            className="mt-1.5 bg-black text-white px-3 py-1.5 text-xs font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all inline-flex items-center gap-1.5"
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Get Streak Freeze
          </button>
        </div>
      </div>
    );
  }

  // alive — normal messages
  const who = name ? `${name}, ` : "";
  let message: string;
  if (streak >= 5) {
    message = `${who}🔥 ${streak}-day streak! Land a fast, hint-free solve for a +25 speed bonus.`;
  } else if (streak >= 2) {
    message = `${who}Streak ${streak} — keep it alive for up to a 1.5× points multiplier!`;
  } else if (level > 1) {
    message = `${who}You're on Level ${level}. Solve fast & clean to bank speed + streak bonuses.`;
  } else {
    message = `${who}Welcome! Solve puzzles, build streaks, and climb the path. Tap "Solve Puzzles" to begin.`;
  }

  return (
    <div
      className={`${styles.welcomeBubble} ${visible ? "" : styles.hidden}`}
      aria-hidden={!visible}
    >
      <Image
        src="/welcome-sprite.png"
        alt="Welcome guide"
        width={58}
        height={58}
        className={styles.avatarImg}
        priority
      />
      <div className={styles.speechBubble}>{message}</div>
    </div>
  );
}
