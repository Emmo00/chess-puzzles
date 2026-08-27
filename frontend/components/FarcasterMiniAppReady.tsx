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

        const context = await sdk.context;
        // Prompt user to add the MiniApp if not already added
        if (context?.client?.added === false) {
          try {
            await sdk.actions.addMiniApp();
          } catch (addError) {
            // Silently fail if addMiniApp fails (e.g. user rejects or dev environment)
            console.warn("Farcaster addMiniApp prompt failed or rejected", addError);
          }
        }
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
