"use client";

import { useRouter } from "next/navigation";
import {
  Check,
  Crown,
  Gift,
  LockKeyhole,
  Puzzle,
  Star,
  Zap,
  X,
} from "lucide-react";
import { pointsForLevel, isChestLevel } from "@/lib/leveling";

export type LevelModalState = "completed" | "current" | "locked";

export interface LevelModalData {
  level: number;
  state: LevelModalState;
  currentLevel: number;
  progressPercent: number;
  pointsToGo: number;
  points: number;
}

interface LevelDetailsModalProps {
  data: LevelModalData | null;
  onClose: () => void;
  onSolve: () => void;
}

function nextMilestone(level: number): number {
  return Math.ceil(level / 5) * 5;
}

export function LevelDetailsModal({
  data,
  onClose,
  onSolve,
}: LevelDetailsModalProps) {
  const router = useRouter();

  if (!data) return null;

  const { level, state, currentLevel, progressPercent, pointsToGo } = data;
  const ptsThreshold = pointsForLevel(level);
  const isChest = isChestLevel(level);
  const upcomingMilestone = nextMilestone(currentLevel);
  const milestonesAway = upcomingMilestone - currentLevel;

  const isLocked = state === "locked";
  const isCompleted = state === "completed";
  const isCurrent = state === "current";

  const handleSolve = () => {
    onClose();
    onSolve();
  };

  return (
    <div
      className="fixed inset-0 z-50 p-4 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Level ${level} details`}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] max-w-xs w-full">
        <div
          className={`${isLocked ? "bg-gray-400" : isCurrent ? "bg-cyan-400" : "bg-lime-400"} border-b-4 border-black p-4 flex justify-between items-center`}
        >
          <h2 className="text-xl font-black uppercase text-black">
            Level {level}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-red-500 border-2 border-black text-black flex items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,1)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Level badge */}
          <div className="flex justify-center">
            <div
              className={`grid place-items-center border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] ${
                isCompleted
                  ? "w-20 h-20 rounded-2xl bg-lime-400"
                  : isCurrent
                    ? "w-24 h-24 rounded-2xl bg-cyan-400"
                    : "w-20 h-20 rounded-2xl bg-gray-300"
              }`}
            >
              {isChest && isCompleted ? (
                <span className="relative grid place-items-center">
                  <Gift
                    strokeWidth={3.5}
                    size={isCurrent ? 44 : 38}
                    aria-hidden="true"
                  />
                  <Check
                    className="absolute -right-2.5 -bottom-2.5 bg-lime-400 border-2 border-black rounded-full p-0.5"
                    strokeWidth={4}
                    size={20}
                    aria-hidden="true"
                  />
                </span>
              ) : isChest ? (
                isLocked ? (
                  <Gift strokeWidth={3} size={36} opacity={0.4} aria-hidden="true" />
                ) : (
                  <Gift strokeWidth={3.5} size={38} aria-hidden="true" />
                )
              ) : isCompleted ? (
                <Check strokeWidth={4.5} size={36} aria-hidden="true" />
              ) : isLocked ? (
                <LockKeyhole strokeWidth={3.5} size={34} aria-hidden="true" />
              ) : (
                <span className="text-3xl font-extrabold tabular-nums">
                  {level}
                </span>
              )}
            </div>
          </div>

          {/* Points threshold */}
          <div className="bg-white border-2 border-black p-2 text-center">
            <span className="text-xs font-black uppercase text-black/60">
              Points required
            </span>
            <div className="text-xl font-black tabular-nums">
              {ptsThreshold.toLocaleString("en-US")} pts
            </div>
          </div>

          {/* Current level extra */}
          {isCurrent && (
            <>
              <div className="bg-yellow-200 border-2 border-black p-3">
                <div className="text-xs font-black uppercase text-black mb-1">
                  Progress
                </div>
                <div className="h-3 border-2 border-black bg-white mb-2">
                  <div
                    className="h-full bg-lime-400 border-r-2 border-black transition-all"
                    style={{ width: `${Math.min(100, progressPercent)}%` }}
                  />
                </div>
                <div className="text-sm font-black text-black">
                  {pointsToGo > 0
                    ? `${pointsToGo.toLocaleString("en-US")} pts to go`
                    : "Level complete!"}
                </div>
              </div>

              {milestonesAway > 0 && milestonesAway <= 5 && (
                <div className="bg-purple-200 border-2 border-black p-2 text-center inline-flex items-center gap-2 justify-center w-full">
                  <Star className="w-4 h-4" />
                  <span className="text-xs font-black uppercase">
                    {milestonesAway === 1
                      ? "Next level is a chest!"
                      : `${milestonesAway} more levels until your next chest`}
                  </span>
                </div>
              )}

              <button
                onClick={handleSolve}
                className="w-full bg-lime-500 text-black py-3 px-4 font-black text-lg uppercase border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all inline-flex items-center justify-center gap-2"
              >
                <Puzzle className="w-5 h-5" /> Solve Puzzles
              </button>
            </>
          )}

          {/* Locked CTA */}
          {isLocked && (
            <button
              onClick={handleSolve}
              className="w-full bg-lime-500 text-black py-3 px-4 font-black text-lg uppercase border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all inline-flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" /> Solve Puzzles
            </button>
          )}

          {/* Completed */}
          {isCompleted && (
            <div className="bg-green-200 border-2 border-black p-2 text-center">
              <span className="inline-flex items-center gap-1 text-xs font-black uppercase">
                <Check className="w-4 h-4" /> Completed
              </span>
            </div>
          )}

          {/* Chest tag */}
          {isChest && (
            <div className="bg-yellow-300 border-2 border-black p-2 text-center">
              <span className="inline-flex items-center gap-1 text-xs font-black uppercase">
                <Crown className="w-4 h-4" />
                {isCompleted ? "Milestone unlocked!" : "Milestone level"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
