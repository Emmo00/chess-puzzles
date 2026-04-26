import { http, createConfig } from "wagmi";
import { celo } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";

export const config = createConfig({
  chains: [celo],
  connectors: [farcasterMiniApp(), injected()],
  transports: {
    [celo.id]: http(),
  },
});

// Preferred chain (Celo mainnet only)
export const PREFERRED_CHAIN = celo;

// Helper to check if user is on correct chain
export const isOnCorrectChain = (chainId?: number): boolean => {
  if (!chainId) return false;
  return chainId === celo.id;
};

export const SUPPORTED_CURRENCIES = [
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
  {
    symbol: "cEUR",
    tokenAddress: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
    feeCurrencyAddress: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
    decimals: 18,
  },
  {
    symbol: "cREAL",
    tokenAddress: "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787",
    feeCurrencyAddress: "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787",
    decimals: 18,
  },
] as const;

// cUSD Contract Address (Celo mainnet only)
export const CUSD_ADDRESSES = {
  [celo.id]: "0x765DE816845861e75A25fCA122bb6898B8B1282a", // Celo cUSD Mainnet
} as const;

// Payment recipient address
export const PAYMENT_RECIPIENT = "0xEA22ca862C3AFDA79Ef7Fb5Ae8f13D245354f05b";

// Payout Claim Contract
export const PAYOUT_CLAIM_CONTRACT = "0x4DF823F6A36b35A3983afc41f7c3584C1DCBFDf1";

// Chess Puzzles Store Contract
export const STORE_CONTRACT = "0x5f23E64A2228F9a5f54527E62755203bC6D9F305";

// MiniPay detection helper
export const isMiniPay = (): boolean => {
  if (typeof window !== "undefined" && window.ethereum) {
    return Boolean(window.ethereum.isMiniPay);
  }
  return false;
};

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
