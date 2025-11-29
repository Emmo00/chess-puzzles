import { http, createConfig } from "wagmi";
import { mainnet, polygon, optimism, arbitrum, base, celo, celoSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const config = createConfig({
  chains: [celoSepolia, celo, base, mainnet],
  connectors: [injected()],
  transports: {
    [celoSepolia.id]: http(),
    [celo.id]: http(),
    [base.id]: http(),
    [mainnet.id]: http(),
  },
});

// USDC Contract Addresses
export const USDC_ADDRESSES = {
  [base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC
  [mainnet.id]: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Ethereum USDC
  [celo.id]: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", // Celo USDC (cUSD)
  [celoSepolia.id]: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1", // Celo Testnet USDC
} as const;

// Payment recipient address
export const PAYMENT_RECIPIENT = "0x7b054580aEA6B6cbdF30BbbE84777bae623F4d1e";

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
