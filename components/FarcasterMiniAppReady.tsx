"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export function FarcasterMiniAppReady() {
  useEffect(() => {
    let cancelled = false;

    const notifyReady = async () => {
      try {
        const isMiniApp = await sdk.isInMiniApp();
        if (!isMiniApp || cancelled) {
          return;
        }

        await sdk.actions.ready();
      } catch (error) {
        console.error("Farcaster ready signal failed", error);
      }
    };

    void notifyReady();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
