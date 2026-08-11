"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useAppBootstrap } from "@/lib/hooks/appBootstrap";
import type { BootstrapStep } from "@/lib/hooks/appBootstrap";

const STEP_ORDER: BootstrapStep[] = ["wallet", "profile", "daily", "assets", "map"];

const STEP_LABELS: Record<BootstrapStep, string> = {
  wallet: "Connecting your wallet",
  profile: "Loading your progress",
  daily: "Checking today's challenge",
  assets: "Preparing your items",
  map: "Locating you on the map",
};

export function AppStartupOverlay() {
  const { ready, step, stepsDone } = useAppBootstrap();
  const [fading, setFading] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setFading(true);
    const t = window.setTimeout(() => setRemoved(true), 550);
    return () => window.clearTimeout(t);
  }, [ready]);

  if (removed) return null;

  const label = STEP_LABELS[step] ?? STEP_LABELS.wallet;

  return (
    <div
      role="status"
      aria-busy={!ready}
      className={`fixed inset-0 z-[100] app-paper-bg flex items-center justify-center p-4 transition-all duration-500 ${
        fading ? "opacity-0 scale-[1.03] pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      <div className="w-full max-w-xs bg-yellow-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform -rotate-1 animate-in fade-in duration-300">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="leading-none tracking-tight">
            <div className="text-3xl font-black uppercase text-black">Chess</div>
            <div className="text-3xl font-black uppercase text-black">Puzzles</div>
          </div>

          <Image
            src="/welcome-sprite.png"
            alt="Guide"
            width={64}
            height={64}
            className="[animation:bob_1.6s_ease-in-out_infinite]"
            priority
          />

          <p className="text-[11px] font-black uppercase tracking-widest text-black/70 inline-flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> {label}…
          </p>

          <div className="flex items-center justify-center gap-2 w-full" aria-hidden>
            {STEP_ORDER.map((s) => {
              const done = stepsDone.includes(s);
              const active = s === step && !done;
              return (
                <div
                  key={s}
                  className={`h-2 flex-1 border-2 border-black transition-colors ${
                    done
                      ? "bg-black"
                      : active
                        ? "bg-yellow-200 [animation:stepPulse_0.9s_ease-in-out_infinite]"
                        : "bg-white"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}