"use client";

import { useState, useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect } from "wagmi";
import { Smartphone, TriangleAlert, Zap } from "lucide-react";
import { isMiniPay } from "@/lib/config/wagmi";
import { useChainSwitching } from "../lib/hooks/useChainSwitching";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const [isMiniPayDetected, setIsMiniPayDetected] = useState(false);
  const [isFarcasterMiniApp, setIsFarcasterMiniApp] = useState(false);
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);
  const { isOnCorrectChain, switchToPreferredChain } = useChainSwitching();

  const farcasterConnector = connectors.find(
    (connector) =>
      connector.id.toLowerCase().includes("farcaster") || connector.name.toLowerCase().includes("farcaster"),
  );

  const injectedConnector = connectors.find((connector) => connector.type === "injected");

  useEffect(() => {
    const miniPayDetected = isMiniPay() || false;
    setIsMiniPayDetected(miniPayDetected);
  }, []);

  useEffect(() => {
    const detectMiniApp = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        setIsFarcasterMiniApp(inMiniApp);
      } catch {
        setIsFarcasterMiniApp(false);
      }
    };

    void detectMiniApp();
  }, []);

  useEffect(() => {
    if (isConnected || isPending || autoConnectAttempted) {
      return;
    }

    if (isFarcasterMiniApp && farcasterConnector) {
      setAutoConnectAttempted(true);
      connect({ connector: farcasterConnector });
      return;
    }

    // Auto-connect for MiniPay users
    if (isMiniPayDetected && injectedConnector) {
      setAutoConnectAttempted(true);
      connect({ connector: injectedConnector });
    }
  }, [
    isConnected,
    isPending,
    autoConnectAttempted,
    isFarcasterMiniApp,
    farcasterConnector,
    isMiniPayDetected,
    injectedConnector,
    connect,
  ]);

  if (isConnected) {
    return (
      <div>
        {!isOnCorrectChain && (
          <div className="relative">
            <button
              onClick={!isOnCorrectChain ? switchToPreferredChain : undefined}
              className={`px-4 py-3 border-4 border-black font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:transform hover:-translate-x-1 hover:-translate-y-1 ${
                isOnCorrectChain ? "" : "bg-yellow-400 text-black hover:bg-yellow-300 cursor-pointer animate-pulse"
              }`}
            >
              {isMiniPayDetected && <Smartphone className="w-5 h-5" />}
              {!isOnCorrectChain && <TriangleAlert className="w-5 h-5 animate-bounce" />}
              {/* <span className="font-black">{formatAddress(address)}</span> */}
            </button>
            {!isOnCorrectChain && (
              <div className="absolute top-full mt-2 right-0 bg-red-400 border-4 border-black p-3 text-xs font-black text-black uppercase tracking-wide whitespace-nowrap z-50 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform rotate-2">
                <span className="inline-flex items-center gap-1">
                  <Zap className="w-4 h-4" /> CLICK TO SWITCH TO CELO!
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // For MiniPay, show a simplified connect button (auto-connects)
  if (isMiniPayDetected) {
    return (
      <button
        onClick={() => {
          if (injectedConnector) {
            connect({ connector: injectedConnector });
          }
        }}
        disabled={isPending}
        className="bg-cyan-400 border-4 border-black px-4 py-3 font-black text-xs uppercase tracking-wider text-black transition-all duration-200 flex items-center gap-2 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:transform hover:-translate-x-1 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-[4px_4px_0px_rgba(0,0,0,1)]"
      >
        <Smartphone className="w-5 h-5" />
        {isPending ? "CONNECTING..." : "CONNECT MINIPAY"}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={async () => {
          let inMiniApp = false;

          try {
            inMiniApp = await sdk.isInMiniApp();
          } catch {
            inMiniApp = false;
          }

          const connector = inMiniApp ? farcasterConnector : injectedConnector;
          if (connector) {
            connect({ connector });
          }
        }}
        disabled={isPending}
        className="bg-purple-400 border-4 border-black px-4 py-3 font-black text-xs uppercase tracking-wider text-black transition-all duration-200 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:transform hover:-translate-x-1 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-[4px_4px_0px_rgba(0,0,0,1)]"
      >
        {isPending ? "CONNECTING..." : "CONNECT WALLET"}
      </button>
    </div>
  );
}
