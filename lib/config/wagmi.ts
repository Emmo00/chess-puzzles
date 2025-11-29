import { http, createConfig } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const config = createConfig({
  chains: [celoSepolia, celo],
  connectors: [injected()],
  transports: {
    [celoSepolia.id]: http(),
    [celo.id]: http(),
  },
});

// cUSD Contract Addresses (using cUSD instead of USDC for MiniPay)
export const CUSD_ADDRESSES = {
  [celo.id]: "0x765DE816845861e75A25fCA122bb6898B8B1282a", // Celo cUSD Mainnet
  [celoSepolia.id]: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1", // Celo Sepolia cUSD
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
