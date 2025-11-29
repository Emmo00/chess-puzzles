"use client";

import { useState, useEffect } from "react";
import { injected, useAccount, useConnect, useDisconnect } from "wagmi";
import { formatAddress } from "@/lib/utils/formatAddress";
import { isMiniPay } from "@/lib/config/wagmi";
import { useChainSwitching } from "../lib/hooks/useChainSwitching";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [isMiniPayDetected, setIsMiniPayDetected] = useState(false);
  const { isOnCorrectChain, switchToPreferredChain } = useChainSwitching();

  useEffect(() => {
    const miniPayDetected = isMiniPay() || false;
    setIsMiniPayDetected(miniPayDetected);

    // Auto-connect for MiniPay users
    if (miniPayDetected && !isConnected && !isPending && connectors.length > 0) {
      const injectedConnector = connectors.find((c) => c.type === "injected");
      if (injectedConnector) {
        connect({ connector: injectedConnector });
      }
    }
  }, [isConnected, isPending, connectors, connect]);

  if (isConnected) {
    return (
      <div className="relative">
        <button 
          onClick={!isOnCorrectChain ? switchToPreferredChain : undefined}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            isOnCorrectChain 
              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 cursor-pointer'
          }`}
        >
          {isMiniPayDetected && <span className="text-xs">📱</span>}
          {!isOnCorrectChain && <span className="text-xs">⚠️</span>}
          {formatAddress(address)}
        </button>
        {!isOnCorrectChain && (
          <div className="absolute top-full mt-1 right-0 bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800 whitespace-nowrap z-50">
            Click to switch to Celo
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
          const injectedConnector = connectors.find((c) => c.type === "injected");
          if (injectedConnector) {
            connect({ connector: injectedConnector });
          }
        }}
        disabled={isPending}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        📱 {isPending ? "Connecting..." : "Connect MiniPay"}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => connect({ connector: injected() })}
        disabled={isPending}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
      >
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>
    </div>
  );
}
