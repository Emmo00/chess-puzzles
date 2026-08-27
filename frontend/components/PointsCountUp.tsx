"use client";

import { useEffect, useRef, useState } from "react";
import { Coins, Flame, Zap, Lightbulb } from "lucide-react";

export interface PointsBreakdown {
  base: number;
  hintPenalty: number;
  streakMultiplier: number;
  speedBonus: number;
  points: number;
  failed: boolean;
}

interface PointsCountUpProps {
  breakdown: PointsBreakdown | null;
  oldTotal: number;
  newTotal: number;
}

function useCountUp(target: number, durationMs: number, start: boolean): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!start) {
      setValue(0);
      return;
    }
    const startTime = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs, start]);

  return value;
}

export function PointsCountUp({ breakdown, oldTotal, newTotal }: PointsCountUpProps) {
  const [stage, setStage] = useState(0);
  const earned = breakdown?.points ?? newTotal - oldTotal;
  const animatedEarned = useCountUp(earned, 700, stage >= 1);
  const animatedTotal = useCountUp(newTotal, 900, stage >= 3);

  useEffect(() => {
    setStage(0);
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setStage(1), 150));
    timers.push(window.setTimeout(() => setStage(2), 750));
    timers.push(window.setTimeout(() => setStage(3), 1150));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [breakdown, newTotal]);

  if (!breakdown) {
    return (
      <div className="bg-white border-2 border-black p-2 text-center">
        <span className="text-2xl font-black text-black">+{earned}</span>
        <span className="text-xs font-black uppercase text-black/60 ml-1">pts</span>
      </div>
    );
  }

  if (breakdown.failed) {
    return (
      <div className="bg-red-300 border-2 border-black p-2 text-center">
        <span className="text-lg font-black text-black uppercase">No points — puzzle failed</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="bg-white border-2 border-black p-2 text-center">
        <span className="text-3xl font-black text-black tabular-nums">+{animatedEarned}</span>
        <span className="text-xs font-black uppercase text-black/60 ml-1">pts</span>
      </div>

      <div className="flex flex-wrap justify-center gap-1.5">
        {stage >= 1 && (
          <span
            className="px-2 py-0.5 text-[10px] font-black uppercase border-2 border-black bg-cyan-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] inline-flex items-center gap-1"
            style={{ animation: "popIn 280ms cubic-bezier(0.2,1.4,0.4,1) both" }}
          >
            <Coins className="w-3 h-3" /> base {breakdown.base}
          </span>
        )}
        {stage >= 1 && breakdown.hintPenalty > 0 && (
          <span
            className="px-2 py-0.5 text-[10px] font-black uppercase border-2 border-black bg-yellow-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] inline-flex items-center gap-1"
            style={{ animation: "popIn 280ms cubic-bezier(0.2,1.4,0.4,1) both" }}
          >
            <Lightbulb className="w-3 h-3" /> −{breakdown.hintPenalty}
          </span>
        )}
        {stage >= 2 && breakdown.streakMultiplier > 1 && (
          <span
            className="px-2 py-0.5 text-[10px] font-black uppercase border-2 border-black bg-orange-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] inline-flex items-center gap-1"
            style={{ animation: "popIn 280ms cubic-bezier(0.2,1.4,0.4,1) both" }}
          >
            <Flame className="w-3 h-3" /> streak ×{breakdown.streakMultiplier.toFixed(1)}
          </span>
        )}
        {stage >= 2 && breakdown.speedBonus > 0 && (
          <span
            className="px-2 py-0.5 text-[10px] font-black uppercase border-2 border-black bg-lime-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] inline-flex items-center gap-1"
            style={{ animation: "popIn 280ms cubic-bezier(0.2,1.4,0.4,1) both" }}
          >
            <Zap className="w-3 h-3" /> +{breakdown.speedBonus} speed
          </span>
        )}
      </div>

      {stage >= 3 && (
        <div
          className="bg-black text-white border-2 border-black p-1.5 text-center"
          style={{ animation: "popIn 320ms cubic-bezier(0.2,1.4,0.4,1) both" }}
        >
          <span className="text-[10px] font-black uppercase text-white/70 mr-1">TOTAL</span>
          <span className="text-xl font-black tabular-nums">{animatedTotal.toLocaleString("en-US")}</span>
        </div>
      )}
    </div>
  );
}
