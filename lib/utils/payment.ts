import { parseUnits } from "viem";
import { CUSD_ADDRESSES, PAYMENT_RECIPIENT } from "../config/wagmi";
import { stableTokenABI } from "@celo/abis";

// Payment amounts in cUSD (18 decimals)
export const PAYMENT_AMOUNTS = {
  DAILY_ACCESS: parseUnits("0.1", 18), // 0.1 cUSD
  PREMIUM: parseUnits("1", 18), // 1 cUSD
} as const;

// Use Celo's stable token ABI for cUSD
export const CUSD_ABI = stableTokenABI;

export function getCUSDAddress(chainId: number): string {
  const address = CUSD_ADDRESSES[chainId as keyof typeof CUSD_ADDRESSES];
  if (!address) {
    throw new Error(`cUSD not supported on chain ${chainId}`);
  }
  return address;
}

export function formatCUSD(amount: bigint): string {
  return (Number(amount) / 1e18).toFixed(2);
}

// MiniPay auto-connect helper
export async function autoConnectMiniPay(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null;
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
      params: [],
    });
    
    return accounts[0] || null;
  } catch (error) {
    console.error('Failed to auto-connect MiniPay:', error);
    return null;
  }
}

export { PAYMENT_RECIPIENT };