import { http, createConfig } from "wagmi";
import { celo } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const config = createConfig({
  chains: [celo],
  connectors: [injected()],
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

// cUSD Contract Address (Celo mainnet only)
export const CUSD_ADDRESSES = {
  [celo.id]: "0x765DE816845861e75A25fCA122bb6898B8B1282a", // Celo cUSD Mainnet
} as const;

// Payment recipient address
export const PAYMENT_RECIPIENT = "0x7b054580aEA6B6cbdF30BbbE84777bae623F4d1e";

// MiniPay detection helper
export const isMiniPay = (): boolean => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return Boolean(window.ethereum.isMiniPay);
  }
  return false;
};

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
