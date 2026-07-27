"use client";

import Image from "next/image";
import styles from "@/app/page.module.css";

interface AvatarBubbleProps {
  visible: boolean;
  streak: number;
  level: number;
  name?: string;
}

function buildMessage(streak: number, level: number, name?: string): string {
  const who = name ? `${name}, ` : "";
  if (streak >= 5) {
    return `${who}🔥 ${streak}-day streak! Land a fast, hint-free solve for a +25 speed bonus.`;
  }
  if (streak >= 2) {
    return `${who}Streak ${streak} — keep it alive for up to a 1.5× points multiplier!`;
  }
  if (level > 1) {
    return `${who}You're on Level ${level}. Solve fast & clean to bank speed + streak bonuses.`;
  }
  return `${who}Welcome! Solve puzzles, build streaks, and climb the path. Tap "Solve Puzzles" to begin.`;
}

export function AvatarBubble({ visible, streak, level, name }: AvatarBubbleProps) {
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
      <div className={styles.speechBubble}>{buildMessage(streak, level, name)}</div>
    </div>
  );
}
