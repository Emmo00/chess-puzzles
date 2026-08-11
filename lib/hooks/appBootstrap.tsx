"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { useUserStats } from "@/lib/hooks/useUserStats";
import type { UserStats } from "@/lib/hooks/useUserStats";
import { useDailyCheckin } from "@/lib/hooks/useDailyCheckin";
import type { DailyCheckinStatus } from "@/lib/hooks/useDailyCheckin";
import { useAssetBalances } from "@/lib/hooks/assetBalances";

export type BootstrapStep = "wallet" | "profile" | "daily" | "assets" | "map";

export interface AppBootstrapState {
  ready: boolean;
  error: string | null;
  step: BootstrapStep;
  stepsDone: BootstrapStep[];
  userStats: UserStats | null;
  dailyStatus: DailyCheckinStatus | null;
  refetch: () => void;
  markMapReady: () => void;
}

// Fails open after this long so a hung request can't strand the user.
const SAFETY_TIMEOUT_MS = 10_000;

const AppBootstrapContext = createContext<AppBootstrapState | null>(null);

export function AppBootstrap({ children }: { children: ReactNode }) {
  const { status, isConnected } = useAccount();
  const pathname = usePathname();
  const {
    userStats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useUserStats();
  const {
    status: dailyStatus,
    loading: dailyLoading,
    error: dailyError,
    refreshStatus,
  } = useDailyCheckin();
  const { loading: assetsLoading } = useAssetBalances();

  // Ensure at least one client pass has happened after the hooked effects ran,
  // so we never treat "not yet fetched" as "settled".
  const [tick, setTick] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setTimedOut(true), SAFETY_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, []);

  const markMapReady = useCallback(() => setMapReady(true), []);

  const accountSettled =
    isConnected || (status !== "connecting" && status !== "reconnecting");
  const profileSettled = isConnected ? !statsLoading && tick > 0 : true;
  const dailySettled = isConnected ? !dailyLoading && tick > 0 : true;
  const assetsSettled = !assetsLoading && tick > 0;

  // The progress map (with the user's position) only exists on the home page.
  // There the loader must wait for that position to render; elsewhere there is
  // no map, so the step is satisfied immediately.
  const isHomePage = pathname === "/";
  const mapSettled = isHomePage ? mapReady && tick > 0 : true;

  const stepsDone = useMemo<BootstrapStep[]>(() => {
    const done: BootstrapStep[] = [];
    if (accountSettled) done.push("wallet");
    if (profileSettled) done.push("profile");
    if (dailySettled) done.push("daily");
    if (assetsSettled) done.push("assets");
    if (mapSettled) done.push("map");
    return done;
  }, [accountSettled, profileSettled, dailySettled, assetsSettled, mapSettled]);

  const currentStep = useMemo<BootstrapStep>(() => {
    if (!accountSettled) return "wallet";
    if (!profileSettled) return "profile";
    if (!dailySettled) return "daily";
    if (!assetsSettled) return "assets";
    return "map";
  }, [accountSettled, profileSettled, dailySettled, assetsSettled]);

  const error = statsError || dailyError;
  const ready =
    Boolean(tick > 0 && accountSettled && profileSettled && dailySettled && assetsSettled && mapSettled) ||
    timedOut;

  const refetch = useCallback(() => {
    void refetchStats();
    void refreshStatus();
  }, [refetchStats, refreshStatus]);

  const value = useMemo<AppBootstrapState>(
    () => ({
      ready,
      error,
      step: currentStep,
      stepsDone,
      userStats,
      dailyStatus,
      refetch,
      markMapReady,
    }),
    [ready, error, currentStep, stepsDone, userStats, dailyStatus, refetch, markMapReady],
  );

  return (
    <AppBootstrapContext.Provider value={value}>
      {children}
    </AppBootstrapContext.Provider>
  );
}

export function useAppBootstrap(): AppBootstrapState {
  const ctx = useContext(AppBootstrapContext);
  if (!ctx) {
    throw new Error("useAppBootstrap must be used within an AppBootstrap provider");
  }
  return ctx;
}