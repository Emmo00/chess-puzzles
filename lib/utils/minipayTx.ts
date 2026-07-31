import { type Abi, type Address, type Hex } from "viem";

const GAS_BUFFER_NUMERATOR = 12n;
const GAS_BUFFER_DENOMINATOR = 10n;
const GAS_FALLBACK_OVERHEAD = 60_000n;
const FORNO_RPC_URL = "https://forno.celo.org";

/**
 * The wagmi public client type (`PublicClient<config, chainId>`) is not
 * assignable to viem's bare `PublicClient`, so these helpers take the client
 * as `any` — matching the existing codebase pattern.
 */
type LegacyTxClient = {
  request: (args: any) => Promise<unknown>;
  estimateContractGas: (args: any) => Promise<bigint>;
};

/**
 * MiniPay is a legacy-transaction-only wallet: it ignores EIP-1559 fields
 * (maxFeePerGas / maxPriorityFeePerGas) and rejects eth_estimateGas /
 * eth_maxPriorityFeePerGas calls made against the injected provider. Every
 * transaction must therefore be submitted as a legacy tx with explicit
 * `gasPrice` and `gas`, both computed from a *public* RPC (never the wallet).
 *
 * On Celo, `eth_gasPrice([feeCurrency])` returns the fee-currency-denominated
 * gas price in 1e-18 (wei-equivalent) units regardless of token decimals.
 * Pass the returned value straight through as the legacy `gasPrice` field.
 */
export async function getLegacyGasPrice(
  publicClient: LegacyTxClient,
  feeCurrency: Hex,
): Promise<bigint> {
  try {
    const gasPrice = (await (publicClient.request as any)({
      method: "eth_gasPrice",
      params: [feeCurrency],
    })) as string;
    return BigInt(gasPrice);
  } catch {
    // Some public RPCs drop the feeCurrency param; fall back to forno directly.
    const response = await fetch(FORNO_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_gasPrice",
        params: [feeCurrency],
        id: 1,
      }),
    });
    const body = (await response.json()) as {
      result?: string;
      error?: { message?: string };
    };
    if (!response.ok || !body.result) {
      throw new Error(body.error?.message || "Failed to fetch gas price");
    }
    return BigInt(body.result);
  }
}

export interface EstimateTxGasParams {
  account: Address;
  address: Address;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
  feeCurrency: Hex;
  fallbackGas: bigint;
}

/**
 * Estimate gas from a public RPC with the feeCurrency set, buffered by 1.2x.
 * Falls back to an estimate without feeCurrency (+60k), then to a constant.
 * Never touches the MiniPay provider (which returns "permission denied").
 */
export async function estimateContractTxGas(
  publicClient: LegacyTxClient,
  {
    account,
    address,
    abi,
    functionName,
    args,
    feeCurrency,
    fallbackGas,
  }: EstimateTxGasParams,
): Promise<bigint> {
  try {
    const gas = await publicClient.estimateContractGas({
      account,
      address,
      abi,
      functionName,
      args: args as never,
      ...({ feeCurrency } as any),
    });
    return (gas * GAS_BUFFER_NUMERATOR) / GAS_BUFFER_DENOMINATOR;
  } catch {
    try {
      const gas = await publicClient.estimateContractGas({
        account,
        address,
        abi,
        functionName,
        args: args as never,
      });
      return (
        (gas * GAS_BUFFER_NUMERATOR) / GAS_BUFFER_DENOMINATOR +
        GAS_FALLBACK_OVERHEAD
      );
    } catch {
      return fallbackGas;
    }
  }
}

/**
 * Combined helper returning everything a legacy MiniPay transaction needs.
 * Throws if the fee-currency-denominated gas price cannot be fetched, since a
 * legacy tx without a correct gasPrice cannot be safely submitted.
 */
export async function buildLegacyTxParams(
  publicClient: LegacyTxClient,
  params: EstimateTxGasParams,
): Promise<{ gas: bigint; gasPrice: bigint; feeCurrency: Hex }> {
  const gasPrice = await getLegacyGasPrice(publicClient, params.feeCurrency);
  const gas = await estimateContractTxGas(publicClient, params);
  return { gas, gasPrice, feeCurrency: params.feeCurrency };
}
