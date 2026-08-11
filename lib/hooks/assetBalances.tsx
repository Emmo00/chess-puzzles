"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { GAME_ASSETS_CONTRACT } from "@/lib/config/wagmi";
import { GAME_ASSETS_ABI } from "@/lib/abi/gameAssets";
import { type Hex } from "viem";

export type AssetType = "hints" | "streakFreezes";

interface PendingPurchase {
  id: string;
  type: AssetType;
  qty: number;
}

export interface AssetBalancesState {
  hintBalance: number;
  streakFreezes: number;
  freeHints: number;
  freeStreakFreezes: number;
  loading: boolean;
  refresh: () => Promise<void>;
  optimisticAdd: (id: string, type: AssetType, qty: number) => void;
  confirmPurchase: (id: string) => Promise<void>;
  rollbackPurchase: (id: string) => Promise<void>;
}

const AssetBalancesContext = createContext<AssetBalancesState | null>(null);

export function AssetBalancesProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [serverHints, setServerHints] = useState(0);
  const [serverFreezes, setServerFreezes] = useState(0);
  const [freeHints, setFreeHints] = useState(0);
  const [freeStreakFreezes, setFreeStreakFreezes] = useState(0);
  const [pending, setPending] = useState<PendingPurchase[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!address || !isConnected) {
      setServerHints(0);
      setServerFreezes(0);
      setFreeHints(0);
      setFreeStreakFreezes(0);
      return;
    }
    setLoading(true);
    try {
      const readContractBalance = async (functionName: string) => {
        if (!publicClient || !GAME_ASSETS_CONTRACT) return 0n;
        try {
          const value = await publicClient.readContract({
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: functionName as "getHintBalance",
            args: [address as Hex],
          });
          return BigInt(value);
        } catch {
          return 0n;
        }
      };

      const [contractHints, contractFreezes, freebiesRes] = await Promise.all([
        readContractBalance("getHintBalance"),
        readContractBalance("getStreakFreezeBalance"),
        fetch(`/api/users/freebies`, {
          headers: { Authorization: `Bearer ${address}` },
        }).then((r) => (r.ok ? r.json() : { freeHints: 0, freeStreakFreezes: 0 })),
      ]);

      const db = freebiesRes as { freeHints: number; freeStreakFreezes: number };
      setFreeHints(db.freeHints ?? 0);
      setFreeStreakFreezes(db.freeStreakFreezes ?? 0);
      setServerHints(Number(contractHints) + (db.freeHints ?? 0));
      setServerFreezes(Number(contractFreezes) + (db.freeStreakFreezes ?? 0));
    } catch {
      setServerHints(0);
      setServerFreezes(0);
      setFreeHints(0);
      setFreeStreakFreezes(0);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected, publicClient]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const optimisticAdd = useCallback((id: string, type: AssetType, qty: number) => {
    setPending((prev) => {
      const existing = prev.find((p) => p.id === id);
      if (existing) {
        return prev.map((p) => (p.id === id ? { id, type, qty } : p));
      }
      return [...prev, { id, type, qty }];
    });
  }, []);

  const confirmPurchase = useCallback(
    async (id: string) => {
      setPending((prev) => prev.filter((p) => p.id !== id));
      await refresh();
    },
    [refresh],
  );

  const rollbackPurchase = useCallback(
    async (id: string) => {
      setPending((prev) => prev.filter((p) => p.id !== id));
      await refresh();
    },
    [refresh],
  );

  const hintBalance = useMemo(
    () => serverHints + pending.filter((p) => p.type === "hints").reduce((sum, p) => sum + p.qty, 0),
    [serverHints, pending],
  );

  const streakFreezes = useMemo(
    () => serverFreezes + pending.filter((p) => p.type === "streakFreezes").reduce((sum, p) => sum + p.qty, 0),
    [serverFreezes, pending],
  );

  const value = useMemo<AssetBalancesState>(
    () => ({
      hintBalance,
      streakFreezes,
      freeHints,
      freeStreakFreezes,
      loading,
      refresh,
      optimisticAdd,
      confirmPurchase,
      rollbackPurchase,
    }),
    [hintBalance, streakFreezes, freeHints, freeStreakFreezes, loading, refresh, optimisticAdd, confirmPurchase, rollbackPurchase],
  );

  return <AssetBalancesContext.Provider value={value}>{children}</AssetBalancesContext.Provider>;
}

export function useAssetBalances(): AssetBalancesState {
  const ctx = useContext(AssetBalancesContext);
  if (!ctx) {
    throw new Error("useAssetBalances must be used within an AssetBalancesProvider");
  }
  return ctx;
}