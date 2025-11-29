"use client";

import { useState, useEffect } from "react";
import { injected, useAccount, useConnect, useDisconnect } from "wagmi";
import { formatAddress } from "@/lib/utils/formatAddress";
import { isMiniPay } from "@/lib/config/wagmi";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [isMiniPayDetected, setIsMiniPayDetected] = useState(false);

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
        <button className="bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors flex items-center gap-2">
          {isMiniPayDetected && <span className="text-xs">📱</span>}
          {formatAddress(address)}
        </button>
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
