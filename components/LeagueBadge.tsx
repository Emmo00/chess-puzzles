"use client";

import { LEAGUES, type League } from "@/lib/leagues";

interface LeagueBadgeProps {
  league: League;
  size?: "sm" | "md";
}

export function LeagueBadge({ league, size = "sm" }: LeagueBadgeProps) {
  const meta = LEAGUES[league];
  const px = size === "md" ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-[10px]";
  return (
    <span
      className={`inline-flex items-center gap-1 border-2 border-black font-black uppercase tracking-wide ${px}`}
      style={{ background: meta.color, boxShadow: "2px 2px 0 #000" }}
      title={meta.name}
    >
      <span aria-hidden="true">{meta.badge}</span>
      {meta.name.split(" ")[0]}
    </span>
  );
}
