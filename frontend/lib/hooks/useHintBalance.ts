"use client";

import { useCallback } from "react";
import { useAccount } from "wagmi";
import { useAssetBalances } from "@/lib/hooks/assetBalances";
import { apiFetch } from "@/lib/api";

export interface HintBalanceState {
  hintBalance: number;
  streakFreezes: number;
  loading: boolean;
  outOfHints: boolean;
  consume: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useHintBalance(): HintBalanceState {
  const { address, isConnected } = useAccount();
  const {
    hintBalance,
    streakFreezes,
    loading,
    refresh,
  } = useAssetBalances();

  const consume = useCallback(async (): Promise<boolean> => {
    if (!address || !isConnected) return false;
    try {
      const res = await apiFetch("/api/hints/consume", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${address}`,
        },
      });
      if (!res.ok) return false;
      void refresh();
      return true;
    } catch {
      return false;
    }
  }, [address, isConnected, refresh]);

  return {
    hintBalance,
    streakFreezes,
    loading,
    outOfHints: hintBalance <= 0,
    consume,
    refresh,
  };
}