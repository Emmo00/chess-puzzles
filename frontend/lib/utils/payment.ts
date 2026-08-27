import { parseUnits } from "viem";
import { CUSD_ADDRESSES, PAYMENT_RECIPIENT } from "../config/wagmi";
import { stableTokenABI } from "@celo/abis";

// Payment amounts in USDm (18 decimals)
export const PAYMENT_AMOUNTS = {
  DAILY_ACCESS: parseUnits("0.1", 18), // 0.1 USDm
} as const;

// Use Celo's stable token ABI (same for all ERC20 stablecoins)
export const CUSD_ABI = stableTokenABI;

export function getCUSDAddress(chainId: number): string {
  const address = CUSD_ADDRESSES[chainId as keyof typeof CUSD_ADDRESSES];
  if (!address) {
    throw new Error(`USDm not supported on chain ${chainId}`);
  }
  return address;
}

export function formatCUSD(amount: bigint): string {
  return (Number(amount) / 1e18).toFixed(2);
}

export { PAYMENT_RECIPIENT };