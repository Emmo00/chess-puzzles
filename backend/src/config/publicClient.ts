import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import { env } from "../config/env";

const rpcUrl = env.CELO_RPC_URL || "https://forno.celo.org";

export const publicClient = createPublicClient({
  chain: celo,
  transport: http(rpcUrl, { timeout: 10_000 }),
});
