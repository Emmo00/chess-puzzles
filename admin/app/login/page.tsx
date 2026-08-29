"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount, useConnect, useSignMessage } from "wagmi";
import { injected } from "wagmi/connectors";

type AuthStep = "connect" | "sign" | "verifying" | "error";

export default function LoginPage() {
  const [step, setStep] = useState<AuthStep>("connect");
  const [error, setError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    if (isConnected && address) {
      handleSign();
    }
  }, [isConnected, address]);

  const handleConnect = useCallback(() => {
    connect({ connector: injected() });
  }, [connect]);

  const handleSign = useCallback(async () => {
    if (!address) return;
    setStep("sign");
    setError(null);

    try {
      // Request nonce
      const nonceRes = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      if (!nonceRes.ok) {
        const data = await nonceRes.json();
        if (nonceRes.status === 403) {
          setError("This wallet is not authorized as an admin.");
          setStep("error");
          return;
        }
        throw new Error(data.error || "Failed to get nonce");
      }

      const { nonce } = await nonceRes.json();

      // Construct SIWE message
      const message = [
        "ChessPuzzles Admin Login",
        "",
        "Wallet:",
        address,
        "",
        "Nonce:",
        nonce,
        "",
        "This request expires in 5 minutes.",
      ].join("\n");

      setStep("verifying");

      // Sign message
      const signature = await signMessageAsync({ message });

      // Verify signature
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature, nonce }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || "Verification failed");
      }

      // Redirect to dashboard
      window.location.href = "/";
    } catch (e: any) {
      setError(e.message || "Authentication failed");
      setStep("connect");
    }
  }, [address, signMessageAsync]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Chess Puzzles Admin</h1>
          <p className="mt-2 text-sm text-gray-600">Connect your admin wallet to continue</p>
        </div>

        {step === "connect" && (
          <div className="space-y-4">
            <button
              onClick={handleConnect}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Connect Wallet
            </button>
            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}
          </div>
        )}

        {step === "sign" && (
          <div className="text-center">
            <p className="text-sm text-gray-600">Please sign the message in your wallet...</p>
          </div>
        )}

        {step === "verifying" && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Verifying signature...</p>
          </div>
        )}

        {step === "error" && (
          <div className="text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={() => { setStep("connect"); setError(null); }}
              className="mt-4 text-sm text-indigo-600 hover:text-indigo-500"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
