"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";

interface DailyChallengePuzzle {
  puzzleid: string;
  fen: string;
  rating: number;
  ratingdeviation: number;
  moves: string[];
  themes: string[];
}

interface ReservationData {
  status: string;
  pendingExpiresAt?: string;
  claimDeadline?: number;
  claimNonce?: string;
  claimSignature?: `0x${string}`;
  claimTxHash?: string;
  claimedAt?: string;
}

export interface DailyCheckinStatus {
  utcDay: number;
  maxDailyCheckIns: number;
  checkInAmountWei: string;
  checkInAmountDisplay: string;
  payoutTokenAddress: `0x${string}`;
  payoutTokenDecimals: number;
  payoutTokenSymbol: string;
  activeReservations: number;
  slotsRemaining: number;
  hasSlots: boolean;
  challenge: {
    puzzleId: string;
    fen: string;
    rating: number;
    ratingDeviation: number;
    moves: string[];
    themes: string[];
  } | null;
  reservation: ReservationData | null;
}

interface ReserveResponse {
  success: boolean;
  reusedReservation: boolean;
  utcDay: number;
  checkInAmountWei: string;
  checkInAmountDisplay: string;
  payoutTokenAddress: `0x${string}`;
  payoutTokenDecimals: number;
  payoutTokenSymbol: string;
  maxDailyCheckIns: number;
  activeReservations: number;
  slotsRemaining: number;
  reservation: {
    status: string;
    pendingExpiresAt: string;
  };
  puzzle: DailyChallengePuzzle;
}

interface SolveResponse {
  success: boolean;
  status: string;
  checkInAmountWei: string;
  claim: {
    day: number;
    nonce: string;
    deadline: number;
    signature: `0x${string}`;
  };
}

export function useDailyCheckin() {
  const { address } = useAccount();
  const [status, setStatus] = useState<DailyCheckinStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!address) {
      setStatus(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/checkin/status?walletAddress=${address}`, {
        headers: {
          Authorization: `Bearer ${address}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to load check-in status");
      }

      const data = (await response.json()) as DailyCheckinStatus;
      setStatus(data);
    } catch (err) {
      console.error("Check-in status error:", err);
      setError(err instanceof Error ? err.message : "Unknown check-in status error");
    } finally {
      setLoading(false);
    }
  }, [address]);

  const reserveDailyChallenge = useCallback(async (): Promise<ReserveResponse> => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    const response = await fetch("/api/checkin/reserve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${address}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to reserve daily challenge");
    }

    await refreshStatus();
    return data as ReserveResponse;
  }, [address, refreshStatus]);

  const solveDailyChallenge = useCallback(
    async (puzzleId: string): Promise<SolveResponse> => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      const response = await fetch("/api/checkin/solve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${address}`,
        },
        body: JSON.stringify({ puzzleId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to submit daily challenge solution");
      }

      await refreshStatus();
      return data as SolveResponse;
    },
    [address, refreshStatus]
  );

  const confirmClaim = useCallback(
    async (txHash: `0x${string}`) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      const response = await fetch("/api/checkin/claim/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${address}`,
        },
        body: JSON.stringify({ txHash }),
      });

      const data = await response.json();

      if (response.status === 202) {
        return {
          success: false,
          pending: true,
          ...data,
        };
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to confirm claim transaction");
      }

      await refreshStatus();
      return {
        success: true,
        pending: false,
        ...data,
      };
    },
    [address, refreshStatus]
  );

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return {
    status,
    loading,
    error,
    refreshStatus,
    reserveDailyChallenge,
    solveDailyChallenge,
    confirmClaim,
  };
}
