"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Puzzle } from "@/lib/types";
import {
  DEVICE_FINGERPRINT_HEADER,
  getDeviceFingerprint,
} from "@/lib/utils/deviceFingerprint";
import { captureApiDevError } from "@/lib/utils/devStore";
import type { PuzzleRushConfig, PuzzleRushMode } from "@/lib/config/puzzleRush";

export interface PuzzleRushEntitlement {
  canPlay: boolean;
  walletConnected: boolean;
  hasDailyPass: boolean;
  freeSessionsPerDay: number;
  sessionsUsedToday: number;
  freeUsed: boolean;
  user: {
    bestScore: number;
    lastRank: number | null;
    currentRank: number | null;
  } | null;
}

export interface PuzzleRushStatus {
  entitlement: PuzzleRushEntitlement;
  config: PuzzleRushConfig;
}

export interface PuzzleRushActiveState {
  score: number;
  strikes: number;
  puzzlesSolved: number;
  streak: number;
  rating: number;
}

export interface PuzzleRushActivePayload {
  sessionId: string;
  mode: PuzzleRushMode;
  startTime: string;
  deadlineMs: number | null;
  state: PuzzleRushActiveState;
  puzzle: Puzzle | null;
}

export interface PuzzleRushResultStats {
  score: number;
  puzzlesAttempted: number;
  puzzlesSolved: number;
  strikes: number;
  longestStreak: number;
  highestDifficultySolved: number;
  averageTimePerPuzzleSec: number;
  finalRank: number | null;
  rankDelta: number | null;
  durationSec: number;
}

export interface PuzzleRushCompletedPayload {
  sessionId: string;
  mode: PuzzleRushMode;
  completed: true;
  results: PuzzleRushResultStats;
}

export type PuzzleRushStepResponse =
  | {
      completed: false;
      state: PuzzleRushActiveState;
      stepIndex: number;
    }
  | PuzzleRushCompletedPayload;

export interface PuzzleRushLeaderboardEntry {
  rank: number;
  walletAddress: string;
  displayName: string;
  bestScore: number;
}

export interface PuzzleRushLeaderboardResponse {
  leaderboard: PuzzleRushLeaderboardEntry[];
  total: number;
  period: "all" | "today" | "week";
  limit: number;
  offset: number;
  hasMore: boolean;
  userRank: PuzzleRushLeaderboardEntry | null;
}

async function jsonFetch<T>(
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.message || "Request failed");
    (err as any).status = response.status;
    (err as any).code = data.code;
    captureApiDevError("puzzle-rush", response, data);
    throw err;
  }
  return data as T;
}

export function usePuzzleRush() {
  const { address, isConnected } = useAccount();
  const [status, setStatus] = useState<PuzzleRushStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useCallback(
    (): Record<string, string> => ({
      "Content-Type": "application/json",
      Authorization: address ? `Bearer ${address}` : "",
      [DEVICE_FINGERPRINT_HEADER]: getDeviceFingerprint(),
    }),
    [address]
  );

  const refreshStatus = useCallback(async () => {
    if (!isConnected || !address) {
      setStatus(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await jsonFetch<PuzzleRushStatus>(
        `/api/puzzle-rush/status?walletAddress=${encodeURIComponent(address)}`
      );
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load status");
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const startSession = useCallback(
    async (mode: PuzzleRushMode): Promise<PuzzleRushActivePayload> => {
      const data = await jsonFetch<PuzzleRushActivePayload>(
        "/api/puzzle-rush/session/start",
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ mode }),
        }
      );
      await refreshStatus();
      return data;
    },
    [authHeaders, refreshStatus]
  );

  const reportResult = useCallback(
    async (payload: {
      sessionId: string;
      stepIndex: number;
      puzzleId: string;
      solved: boolean;
      solveTimeSec: number;
    }): Promise<PuzzleRushStepResponse> => {
      return jsonFetch<PuzzleRushStepResponse>("/api/puzzle-rush/session/result", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
    },
    [authHeaders]
  );

  const fetchPuzzlesBatch = useCallback(
    async (
      sessionId: string,
      moves: number,
      count = 12
    ): Promise<Puzzle[]> => {
      const data = await jsonFetch<{ puzzles: Puzzle[] }>(
        "/api/puzzle-rush/puzzles",
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ sessionId, moves, count }),
        }
      );
      return data.puzzles;
    },
    [authHeaders]
  );

  const endSession = useCallback(
    async (sessionId: string): Promise<PuzzleRushCompletedPayload> => {
      const data = await jsonFetch<PuzzleRushCompletedPayload>(
        "/api/puzzle-rush/session/end",
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ sessionId }),
        }
      );
      await refreshStatus();
      return data;
    },
    [authHeaders, refreshStatus]
  );

  const fetchLeaderboard = useCallback(
    async (
      period: "all" | "today" | "week" = "all",
      limit = 50,
      offset = 0
    ): Promise<PuzzleRushLeaderboardResponse> => {
      const params = new URLSearchParams({ period, limit: String(limit), offset: String(offset) });
      if (address) params.set("walletAddress", address);
      return jsonFetch<PuzzleRushLeaderboardResponse>(
        `/api/puzzle-rush/leaderboard?${params.toString()}`
      );
    },
    [address]
  );

  return {
    status,
    loading,
    error,
    refreshStatus,
    startSession,
    reportResult,
    fetchPuzzlesBatch,
    endSession,
    fetchLeaderboard,
  };
}
