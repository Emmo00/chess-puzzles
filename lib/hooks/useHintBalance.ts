"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";

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
  const [hintBalance, setHintBalance] = useState<number>(0);
  const [streakFreezes, setStreakFreezes] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!address || !isConnected) {
      setHintBalance(0);
      setStreakFreezes(0);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/hints?walletAddress=${address}`, {
        headers: { "x-wallet-address": address },
      });
      if (res.ok) {
        const data = await res.json();
        setHintBalance(data.hintBalance ?? 0);
        setStreakFreezes(data.streakFreezes ?? 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const consume = useCallback(async (): Promise<boolean> => {
    if (!address || !isConnected) return false;
    try {
      const res = await fetch("/api/hints/consume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address,
          Authorization: `Bearer ${address}`,
        },
      });
      if (!res.ok) return false;
      const data = await res.json();
      setHintBalance(data.hintBalance ?? 0);
      return true;
    } catch {
      return false;
    }
  }, [address, isConnected]);

  return {
    hintBalance,
    streakFreezes,
    loading,
    outOfHints: hintBalance <= 0,
    consume,
    refresh,
  };
}
