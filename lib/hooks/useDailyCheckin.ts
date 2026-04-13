"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  claimTxHash?: string;
  claimedAt?: string;
}

interface ClaimPayload {
  user: `0x${string}`;
  day: number;
  nonce: string;
  deadline: number;
  signature: `0x${string}`;
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
}

export function useDailyCheckin() {
  const { address } = useAccount();
  const claimDebugIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<DailyCheckinStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logClaimFlow = (step: string, details?: Record<string, unknown>) => {
    console.info("[ClaimFlow][useDailyCheckin]", step, details || {});
  };

  const getOrCreateClaimDebugId = useCallback(() => {
    if (!claimDebugIdRef.current) {
      claimDebugIdRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `claim-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    return claimDebugIdRef.current;
  }, []);

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

      logClaimFlow("confirmClaim.start", {
        address,
        txHash,
      });

      const response = await fetch("/api/checkin/claim/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${address}`,
          "x-claim-debug-id": getOrCreateClaimDebugId(),
        },
        body: JSON.stringify({ txHash }),
      });

      const data = await response.json();

      logClaimFlow("confirmClaim.response", {
        address,
        txHash,
        status: response.status,
        ok: response.ok,
        pending: response.status === 202,
        payload: data,
      });

      if (response.status === 202) {
        return {
          success: false,
          pending: true,
          ...data,
        };
      }

      if (!response.ok) {
        claimDebugIdRef.current = null;
        throw new Error(data.message || "Failed to confirm claim transaction");
      }

      await refreshStatus();
      claimDebugIdRef.current = null;
      return {
        success: true,
        pending: false,
        ...data,
      };
    },
    [address, refreshStatus]
  );

  const fetchClaimPayload = useCallback(async (): Promise<ClaimPayload> => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    logClaimFlow("fetchClaimPayload.start", { address });

    const response = await fetch("/api/checkin/claim/payload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${address}`,
        "x-claim-debug-id": getOrCreateClaimDebugId(),
      },
    });

    const data = await response.json();

    logClaimFlow("fetchClaimPayload.response", {
      address,
      status: response.status,
      ok: response.ok,
      user: data?.claim?.user,
      day: data?.claim?.day,
      deadline: data?.claim?.deadline,
      nonce: data?.claim?.nonce,
      signatureLength: data?.claim?.signature?.length,
      error: data?.message,
    });

    if (!response.ok) {
      claimDebugIdRef.current = null;
      throw new Error(data.message || "Failed to fetch fresh claim payload");
    }

    return data.claim as ClaimPayload;
  }, [address, getOrCreateClaimDebugId]);

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
    fetchClaimPayload,
    confirmClaim,
  };
}
