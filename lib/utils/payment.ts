import { PAYMENT_RECIPIENT, REVENUE_COLLECTOR_CONTRACT } from "../config/wagmi";
import { stableTokenABI } from "@celo/abis";

// Supported stable coins on Sollar (addresses and decimals)
export const SUPPORTED_STABLES = [
  {
    symbol: "USDT",
    tokenAddress: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
    feeCurrencyAddress: "0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72",
    decimals: 6,
  },
  {
    symbol: "USDC",
    tokenAddress: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    feeCurrencyAddress: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B",
    decimals: 6,
  },
  {
    symbol: "cUSD",
    tokenAddress: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    feeCurrencyAddress: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    decimals: 18,
  },
];

// ERC20 ABI helper (use Celo stable token ABI where appropriate)
export const CUSD_ABI = stableTokenABI;

export function formatAmount(amount: bigint, decimals = 18): string {
  return (Number(amount) / Math.pow(10, decimals)).toFixed(decimals === 18 ? 2 : 6);
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

export { PAYMENT_RECIPIENT, REVENUE_COLLECTOR_CONTRACT };

