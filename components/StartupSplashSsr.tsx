"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Static, branded splash rendered on the first server/hydration frame so the
// app never flashes a blank white screen. It self-removes as soon as the
// client AppStartupOverlay (same visual language) is ready to take over.
export function StartupSplashSsr() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (mounted) return null;

  return (
    <div
      className="fixed inset-0 z-[99] app-paper-bg flex items-center justify-center p-4"
      aria-hidden
    >
      <div className="w-full max-w-xs bg-yellow-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform -rotate-1 text-center">
        <Image
          src="/chess-puzzles-icon.png"
          alt="Chess Puzzles"
          width={56}
          height={56}
          priority
        />
        <div className="mt-3 leading-none tracking-tight">
          <div className="text-3xl font-black uppercase text-black">Chess</div>
          <div className="text-3xl font-black uppercase text-black">Puzzles</div>
        </div>
      </div>
    </div>
  );
}