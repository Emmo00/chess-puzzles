"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { GAME_ASSETS_CONTRACT, GAME_ASSET_TYPES } from "@/lib/config/wagmi";
import { GAME_ASSETS_ABI } from "@/lib/abi/gameAssets";
import { type Hex } from "viem";

export interface HintBalanceState {
  hintBalance: number;
  streakFreezes: number;
  freeHints: number;
  freeStreakFreezes: number;
  loading: boolean;
  outOfHints: boolean;
  consume: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useHintBalance(): HintBalanceState {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [hintBalance, setHintBalance] = useState<number>(0);
  const [streakFreezes, setStreakFreezes] = useState<number>(0);
  const [freeHints, setFreeHints] = useState<number>(0);
  const [freeStreakFreezes, setFreeStreakFreezes] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!address || !isConnected) {
      setHintBalance(0);
      setStreakFreezes(0);
      setFreeHints(0);
      setFreeStreakFreezes(0);
      return;
    }
    setLoading(true);
    try {
      const [contractHints, contractFreezes, freebiesRes] = await Promise.all([
        publicClient && GAME_ASSETS_CONTRACT
          ? publicClient.readContract({
              address: GAME_ASSETS_CONTRACT,
              abi: GAME_ASSETS_ABI,
              functionName: "getHintBalance",
              args: [address as Hex],
            })
          : 0,
        publicClient && GAME_ASSETS_CONTRACT
          ? publicClient.readContract({
              address: GAME_ASSETS_CONTRACT,
              abi: GAME_ASSETS_ABI,
              functionName: "getStreakFreezeBalance",
              args: [address as Hex],
            })
          : 0,
        fetch(`/api/users/freebies`, {
          headers: { Authorization: `Bearer ${address}` },
        }).then((r) => (r.ok ? r.json() : { freeHints: 0, freeStreakFreezes: 0 })),
      ]);

      const db = freebiesRes as { freeHints: number; freeStreakFreezes: number };
      setFreeHints(db.freeHints ?? 0);
      setFreeStreakFreezes(db.freeStreakFreezes ?? 0);
      setHintBalance(Number(contractHints) + (db.freeHints ?? 0));
      setStreakFreezes(Number(contractFreezes) + (db.freeStreakFreezes ?? 0));
    } catch {
      setHintBalance(0);
      setStreakFreezes(0);
      setFreeHints(0);
      setFreeStreakFreezes(0);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected, publicClient]);

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
          Authorization: `Bearer ${address}`,
        },
      });
      if (!res.ok) return false;
      refresh();
      return true;
    } catch {
      return false;
    }
  }, [address, isConnected, refresh]);

  return {
    hintBalance,
    streakFreezes,
    freeHints,
    freeStreakFreezes,
    loading,
    outOfHints: hintBalance <= 0,
    consume,
    refresh,
  };
}