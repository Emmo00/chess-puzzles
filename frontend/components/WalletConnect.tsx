"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useSwitchChain } from "wagmi";
import { celo } from "wagmi/chains";
import { isMiniPay } from "@/lib/config/wagmi";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { switchChain } = useSwitchChain();
  const [isMiniPayDetected, setIsMiniPayDetected] = useState(false);
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);

  const injectedConnector = connectors.find((connector) => connector.type === "injected");

  useEffect(() => {
    const miniPayDetected = isMiniPay() || false;
    setIsMiniPayDetected(miniPayDetected);
  }, []);

  useEffect(() => {
    if (isConnected) {
      const autoSwitch = async () => {
        try {
          await switchChain({ chainId: celo.id });
        } catch {
          // fail silently
        }
      };
      void autoSwitch();
    }
  }, [isConnected, switchChain]);

  useEffect(() => {
    if (isConnected || isPending || autoConnectAttempted) {
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
    isMiniPayDetected,
    injectedConnector,
    connect,
  ]);

  if (isConnected) {
    return null;
  }

  // MiniPay uses auto-connect only — no button shown
  if (isMiniPayDetected) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (injectedConnector) {
            connect({ connector: injectedConnector });
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
