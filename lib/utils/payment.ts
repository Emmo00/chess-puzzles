import { parseUnits } from "viem";
import { USDC_ADDRESSES, PAYMENT_RECIPIENT } from "../config/wagmi";

// Payment amounts in USDC (6 decimals)
export const PAYMENT_AMOUNTS = {
  DAILY_ACCESS: parseUnits("0.1", 6), // 0.1 USDC
  PREMIUM: parseUnits("1", 6), // 1 USDC
} as const;

// ERC20 ABI for USDC transfers
export const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export function getUSDCAddress(chainId: number): string {
  const address = USDC_ADDRESSES[chainId as keyof typeof USDC_ADDRESSES];
  if (!address) {
    throw new Error(`USDC not supported on chain ${chainId}`);
  }
  return address;
}

export function formatUSDC(amount: bigint): string {
  return (Number(amount) / 1e6).toFixed(2);
}

export { PAYMENT_RECIPIENT };