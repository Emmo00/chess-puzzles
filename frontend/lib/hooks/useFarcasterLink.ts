"use client";

import { useEffect, useRef } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount } from "wagmi";

export function useFarcasterLink() {
  const { address, isConnected } = useAccount();
  const linkedRef = useRef(false);

  useEffect(() => {
    if (!isConnected || !address || linkedRef.current) return;

    const linkFarcaster = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        if (!inMiniApp) return;

        // Try to get FID from context
        const context = await sdk.context;
        const fid = context?.user?.fid;
        
        if (fid) {
          console.log(`Linking Farcaster FID ${fid} to wallet ${address}`);
          const response = await fetch("/api/users/link-farcaster", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${address}`,
            },
            body: JSON.stringify({ fid }),
          });

          if (response.ok) {
            linkedRef.current = true;
            console.log("Successfully linked Farcaster FID");
          }
        }
      } catch (error) {
        console.error("Error linking Farcaster FID:", error);
      }
    };

    void linkFarcaster();
  }, [address, isConnected]);
}
