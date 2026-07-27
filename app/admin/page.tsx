"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { WalletConnect } from "@/components/WalletConnect";
import { StoreItemsAdmin, ScoringConfigAdmin, PerkDistributionAdmin, AccessConfigAdmin } from "@/components/AdminPanels";
import { FrontendErrorsPanel } from "@/components/FrontendErrorsPanel";

type AuthStep = "connect" | "unauthorized" | "sign" | "verifying" | "authenticated";

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<AuthStep>("connect");
  const [nonce, setNonce] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isConnected || !address) {
      setStep("connect");
      return;
    }
    checkSession();
  }, [mounted, isConnected, address]);

  const checkSession = async () => {
    try {
      const res = await fetch("/api/admin/auth/me");
      if (res.ok) {
        setStep("authenticated");
        return;
      }
    } catch {}
    setStep("sign");
  };

  const requestNonce = useCallback(async () => {
    if (!address) return;
    setError(null);
    try {
      const res = await fetch("/api/admin/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (res.status === 403) {
        setStep("unauthorized");
        return;
      }
      if (!res.ok) {
        setError("Failed to get nonce");
        return;
      }
      const data = await res.json();
      setNonce(data.nonce);
      setStep("sign");
    } catch {
      setError("Network error");
    }
  }, [address]);

  useEffect(() => {
    if (step === "sign" && nonce) {
      handleSign();
    }
  }, [step, nonce]);

  const handleSign = useCallback(async () => {
    if (!address || !nonce) return;
    setStep("verifying");
    setError(null);
    try {
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

      const signature = await signMessageAsync({ message });

      const res = await fetch("/api/admin/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature, nonce }),
      });

      if (res.ok) {
        setStep("authenticated");
      } else {
        const data = await res.json();
        setError(data.error || "Verification failed");
        setStep("sign");
      }
    } catch (e: any) {
      setError(e.message || "Signing cancelled");
      setStep("sign");
    }
  }, [address, nonce, signMessageAsync]);

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    setStep("connect");
    setNonce(null);
    setError(null);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen w-full app-paper-bg text-black">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black uppercase tracking-tight">Admin Panel</h1>
          <div className="flex items-center gap-3">
            {step === "authenticated" && (
              <button
                onClick={handleLogout}
                className="bg-black text-white px-4 py-2 font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all"
              >
                Logout
              </button>
            )}
          </div>
        </header>

        {step === "connect" && (
          <div className="bg-cyan-300 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] p-6 text-center max-w-sm mx-auto">
            <h2 className="text-xl font-black uppercase mb-3">Connect Wallet</h2>
            <p className="text-sm font-bold mb-4">Connect your wallet to access the admin panel.</p>
            <div className="flex justify-center">
              <WalletConnect />
            </div>
          </div>
        )}

        {step === "unauthorized" && (
          <div className="bg-red-400 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] p-6 text-center max-w-sm mx-auto">
            <h2 className="text-xl font-black uppercase mb-3">Unauthorized</h2>
            <p className="text-sm font-bold">This wallet is not authorized as an admin.</p>
          </div>
        )}

        {step === "sign" && (
          <div className="bg-yellow-300 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] p-6 text-center max-w-sm mx-auto">
            <h2 className="text-xl font-black uppercase mb-3">Sign In</h2>
            <p className="text-sm font-bold mb-4">Sign the login message with your wallet to continue.</p>
            <button
              onClick={() => { requestNonce(); }}
              className="bg-black text-white px-6 py-3 font-black text-sm uppercase border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
            >
              Sign In
            </button>
            {error && (
              <p className="mt-3 text-xs font-black text-red-800">{error}</p>
            )}
          </div>
        )}

        {step === "verifying" && (
          <div className="bg-yellow-300 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] p-6 text-center max-w-sm mx-auto">
            <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-black mx-auto mb-3"></div>
            <p className="text-sm font-black uppercase">Verifying...</p>
          </div>
        )}

        {step === "authenticated" && (
          <div className="space-y-5">
            <StoreItemsAdmin />
            <AccessConfigAdmin />
            <ScoringConfigAdmin />
            <PerkDistributionAdmin />
            <FrontendErrorsPanel />
          </div>
        )}
      </div>
    </div>
  );
}
