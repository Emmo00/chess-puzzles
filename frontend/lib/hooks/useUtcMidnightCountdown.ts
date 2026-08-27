"use client";

import { useEffect, useState } from "react";

function msUntilNextUtcMidnight(from: Date = new Date()): number {
  const next = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate() + 1,
    0,
    0,
    0
  );
  return Math.max(0, next - from.getTime());
}

export interface CountdownParts {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

function split(ms: number): CountdownParts {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds, totalMs: ms };
}

export function useUtcMidnightCountdown(): CountdownParts {
  const [parts, setParts] = useState<CountdownParts>(() =>
    split(msUntilNextUtcMidnight())
  );

  useEffect(() => {
    const tick = () => setParts(split(msUntilNextUtcMidnight()));

    tick();
    const interval = setInterval(tick, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return parts;
}

export function formatCountdown(parts: CountdownParts): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`;
}
