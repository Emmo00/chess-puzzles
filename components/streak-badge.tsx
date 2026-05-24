"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

interface StreakBadgeProps {
  days: number;
  onClick?: () => void;
}

export default function StreakBadge({ days, onClick }: StreakBadgeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const getStreakEmoji = () => <Flame className="w-6 h-6 text-orange-500" />;

  return (
    <div
      className="animate-in fade-in slide-in-from-right-4 duration-700"
      style={{
        animation: "slideInRight 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
      }}
    >
      <button
        onClick={onClick}
        className="border-4 border-black px-4 py-2 font-black text-sm tracking-wider uppercase transition-all duration-150 transform hover:translate-x-[-2px] hover:translate-y-[-2px] hover:rotate-1 shadow-[5px_5px_0px_#000000] hover:shadow-[7px_7px_0px_#000000] bg-yellow-100 text-black"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{getStreakEmoji()}</span>
          <div className="flex justify-center items-center gap-1">
            <span className="text-xs leading-none">STREAK:</span>
            <span className="text-lg font-black leading-none">{days}</span>
          </div>
        </div>
      </button>
      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(40px) rotate(-5deg);
          }
          to {
            opacity: 1;
            transform: translateX(0) rotate(0deg);
          }
        }
      `}</style>
    </div>
  );
}
