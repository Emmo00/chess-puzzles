"use client";

import { useEffect, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { Navigation } from "@/components/Navigation";
import {
  PAYOUT_CLAIM_CONTRACT,
  PAYOUT_CLAIMS_ABI,
} from "@/lib/contracts";
import { DollarSign, Settings, Send } from "lucide-react";

/* Minimal ERC-20 ABI — only what we need */
const ERC20_ABI = [
  {
    type: "function" as const,
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable" as const,
  },
  {
    type: "function" as const,
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view" as const,
  },
  {
    type: "function" as const,
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view" as const,
  },
] as const;

const USDT_ADDRESS = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" as `0x${string}`;
const USDC_ADDRESS = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as `0x${string}`;
const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

export default function PayoutsPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [contractData, setContractData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        setAuthenticated(true);
        fetchContractData();
      } else {
        window.location.href = "/login";
      }
    } catch {
      window.location.href = "/login";
    }
  };

  const fetchContractData = async () => {
    try {
      const res = await fetch("/api/admin/payouts");
      if (res.ok) {
        const data = await res.json();
        setContractData(data);
      }
    } catch (error) {
      console.error("Failed to fetch contract data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authenticated === null || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Navigation>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Daily Claims / Payout Contract</h1>

        {/* ── Contract Balance ── */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Contract Balance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Current Balance</p>
              <p className="text-2xl font-bold text-green-600">
                {contractData?.balance ?? "0"} USDC
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Theoretical Max Runway</p>
              <p className="text-2xl font-bold text-blue-600">
                {contractData?.theoreticalRunway ?? "∞"} days
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">Actual Usage Runway</p>
              <p className="text-2xl font-bold text-purple-600">
                {contractData?.actualRunway ?? "∞"} days
              </p>
            </div>
          </div>
        </div>

        {/* ── Contract Config ── */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-500" />
            Contract Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Check-in Amount", value: `${contractData?.checkInAmount ?? "0"} USDC` },
              { label: "Max Daily Check-ins", value: contractData?.maxDailyCheckIns ?? "0" },
              { label: "Claims Used Today", value: contractData?.claimsUsedToday ?? "0" },
              { label: "Current Day", value: contractData?.currentDay ?? "0" },
            ].map((item) => (
              <div key={item.label} className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">{item.label}</p>
                <p className="text-lg font-bold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Fund Contract (wallet-signed approve) ── */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-500" />
            Fund Contract
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Approve the Payout Claims contract to pull stablecoin from your wallet. The contract
            uses <code className="bg-gray-100 px-1 rounded text-xs">safeTransferFrom</code> when
            processing user check-in claims, so it needs an allowance on your tokens.
          </p>
          <div className="space-y-4">
            <ApproveTokenCard
              tokenSymbol="USDT"
              tokenAddress={USDT_ADDRESS}
              spenderAddress={PAYOUT_CLAIM_CONTRACT}
            />
            <ApproveTokenCard
              tokenSymbol="USDC"
              tokenAddress={USDC_ADDRESS}
              spenderAddress={PAYOUT_CLAIM_CONTRACT}
            />
          </div>
        </div>

        {/* ── Configuration Actions (wallet-signed) ── */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration Actions</h2>
          <p className="text-sm text-gray-600 mb-4">
            Signed by your connected wallet. The wallet must be the contract owner.
          </p>
          <div className="space-y-4">
            <SetCheckInAmountCard onSuccess={() => fetchContractData()} />
            <SetMaxDailyCheckInsCard onSuccess={() => fetchContractData()} />
          </div>
        </div>
      </div>
    </Navigation>
  );
}

/* ═══════════════════════════════════════════════════════
   Approve Token (wallet-signed)
   ═══════════════════════════════════════════════════════ */

function ApproveTokenCard({
  tokenSymbol,
  tokenAddress,
  spenderAddress,
}: {
  tokenSymbol: string;
  tokenAddress: `0x${string}`;
  spenderAddress: string;
}) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { address: wallet, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);
    try {
      const wei = BigInt(Math.round(parseFloat(amount) * 1e6));
      await writeContractAsync({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spenderAddress as `0x${string}`, wei],
      });
      setSuccess(true);
      setAmount("");
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "Transaction failed");
    }
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <h3 className="font-medium text-gray-900">Approve {tokenSymbol}</h3>
      <p className="text-sm text-gray-500 mb-2">
        Allow the payout contract to pull {tokenSymbol} from your wallet.
      </p>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount ({tokenSymbol})
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!isConnected || !amount}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {!isConnected ? "Connect Wallet" : `Approve ${tokenSymbol}`}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {success && (
        <p className="mt-2 text-sm text-green-600">
          {tokenSymbol} approved — the payout contract can now pull up to the approved amount.
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Set Check-in Amount (wallet-signed)
   ═══════════════════════════════════════════════════════ */

function SetCheckInAmountCard({ onSuccess }: { onSuccess: () => void }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);
    try {
      const weiAmount = BigInt(Math.round(parseFloat(amount) * 1e6));
      await writeContractAsync({
        address: PAYOUT_CLAIM_CONTRACT,
        abi: PAYOUT_CLAIMS_ABI,
        functionName: "setCheckInAmount",
        args: [weiAmount],
      });
      setSuccess(true);
      onSuccess();
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "Transaction failed");
    }
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <h3 className="font-medium text-gray-900">Set Check-in Amount</h3>
      <p className="text-sm text-gray-600 mb-3">Update the amount paid per check-in</p>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USDC)</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!isConnected || !amount}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {!isConnected ? "Connect Wallet" : "Submit"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-2 text-sm text-green-600">Transaction submitted!</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Set Max Daily Check-ins (wallet-signed)
   ═══════════════════════════════════════════════════════ */

function SetMaxDailyCheckInsCard({ onSuccess }: { onSuccess: () => void }) {
  const [max, setMax] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);
    try {
      await writeContractAsync({
        address: PAYOUT_CLAIM_CONTRACT,
        abi: PAYOUT_CLAIMS_ABI,
        functionName: "setMaxDailyCheckIns",
        args: [BigInt(parseInt(max, 10))],
      });
      setSuccess(true);
      onSuccess();
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "Transaction failed");
    }
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <h3 className="font-medium text-gray-900">Set Max Daily Check-ins</h3>
      <p className="text-sm text-gray-600 mb-3">Update the maximum daily check-in limit</p>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Daily</label>
          <input
            type="number"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!isConnected || !max}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {!isConnected ? "Connect Wallet" : "Submit"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-2 text-sm text-green-600">Transaction submitted!</p>}
    </div>
  );
}
