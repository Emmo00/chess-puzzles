import { http, fallback, createConfig } from "wagmi";
import { celo } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { PAYOUT_CLAIM_CONTRACT, GAME_ASSETS_CONTRACT } from "@workspace/contracts";

const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || "https://forno.celo.org";

export const config = createConfig({
  chains: [celo],
  connectors: [injected()],
  ssr: true,
  transports: {
    [celo.id]: fallback(
      [
        http(rpcUrl, { timeout: 6_000 }),
        http("https://celo.drpc.org", { timeout: 10_000 }),
        http("https://rpc.ankr.com/celo", { timeout: 10_000 }),
      ],
      { rank: true, retryCount: 2 },
    ),
  },
});

// Re-export contract addresses for convenience
export { PAYOUT_CLAIM_CONTRACT, GAME_ASSETS_CONTRACT };

// Helper to check if user is on correct chain
export const isOnCorrectChain = (chainId?: number): boolean => {
  if (!chainId) return false;
  return chainId === celo.id;
};

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
