import { SUPPORTED_CURRENCIES } from "@/lib/config/wagmi";

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

interface SelectFeeCurrencyParams {
  publicClient: any;
  account: `0x${string}`;
  to: `0x${string}`;
  data?: `0x${string}`;
  value?: bigint;
}

const GAS_SAFETY_NUMERATOR = BigInt(12);
const GAS_SAFETY_DENOMINATOR = BigInt(10);

export async function selectSupportedFeeCurrency({
  publicClient,
  account,
  to,
  data,
  value = BigInt(0),
}: SelectFeeCurrencyParams): Promise<`0x${string}`> {
  const seen = new Set<string>();
  const candidates = SUPPORTED_CURRENCIES.filter((address) => {
    const lowered = address.toLowerCase();
    if (seen.has(lowered)) {
      return false;
    }
    seen.add(lowered);
    return true;
  }) as `0x${string}`[];

  for (const feeCurrency of candidates) {
    try {
      const [balance, gasEstimate, gasPriceHex] = await Promise.all([
        publicClient.readContract({
          address: feeCurrency,
          abi: ERC20_BALANCE_ABI,
          functionName: "balanceOf",
          args: [account],
        }),
        publicClient.estimateGas({
          account,
          to,
          data,
          value,
          feeCurrency,
        }),
        publicClient.request({
          method: "eth_gasPrice",
          params: [feeCurrency],
        }),
      ]);

      const gasPrice = BigInt(gasPriceHex as string);
      const estimatedFeeWithBuffer =
        (gasEstimate * gasPrice * GAS_SAFETY_NUMERATOR) / GAS_SAFETY_DENOMINATOR;

      if (balance >= estimatedFeeWithBuffer) {
        return feeCurrency;
      }
    } catch {
      // Skip currencies that are unsupported by wallet/network or missing balance for fees.
      continue;
    }
  }

  throw new Error(
    "No supported fee currency has enough balance to cover gas. Fund one of SUPPORTED_CURRENCIES and try again."
  );
}
