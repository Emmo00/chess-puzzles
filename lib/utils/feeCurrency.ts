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
const FEE_ABSTRACTION_GAS_OVERHEAD = BigInt(50000);

const pow10BigInt = (exp: number): bigint => {
  let result = BigInt(1);
  for (let i = 0; i < exp; i += 1) {
    result *= BigInt(10);
  }
  return result;
};

const normalizeAmountTo18Decimals = (amount: bigint, decimals: number): bigint => {
  if (decimals === 18) {
    return amount;
  }

  if (decimals < 18) {
    return amount * pow10BigInt(18 - decimals);
  }

  return amount / pow10BigInt(decimals - 18);
};

export async function selectSupportedFeeCurrency({
  publicClient,
  account,
  to,
  data,
  value = BigInt(0),
}: SelectFeeCurrencyParams): Promise<`0x${string}`> {
  let baseGasEstimate: bigint;
  try {
    baseGasEstimate = await publicClient.estimateGas({
      account,
      to,
      data,
      value,
    });
  } catch (error: any) {
    const txErrorMessage =
      error?.shortMessage ||
      error?.message ||
      "Transaction simulation failed before fee currency selection.";

    throw new Error(
      `Transaction cannot be executed in current state: ${txErrorMessage}`
    );
  }

  const effectiveGasEstimate = baseGasEstimate + FEE_ABSTRACTION_GAS_OVERHEAD;

  const seen = new Set<string>();
  const candidates = SUPPORTED_CURRENCIES.filter((currency) => {
    const lowered = currency.feeCurrencyAddress.toLowerCase();
    if (seen.has(lowered)) {
      return false;
    }
    seen.add(lowered);
    return true;
  });

  for (const currency of candidates) {
    try {
      const [balance, gasPriceHex] = await Promise.all([
        publicClient.readContract({
          address: currency.tokenAddress,
          abi: ERC20_BALANCE_ABI,
          functionName: "balanceOf",
          args: [account],
        }),
        publicClient.request({
          method: "eth_gasPrice",
          params: [currency.feeCurrencyAddress],
        }),
      ]);

      // Probe feeCurrency support without coupling to target calldata reverts.
      await publicClient.estimateGas({
        account,
        to: account,
        value: BigInt(0),
        feeCurrency: currency.feeCurrencyAddress,
      });

      const gasPrice = BigInt(gasPriceHex as string);
      const estimatedFeeWithBuffer =
        (effectiveGasEstimate * gasPrice * GAS_SAFETY_NUMERATOR) /
        GAS_SAFETY_DENOMINATOR;

      const normalizedBalance = normalizeAmountTo18Decimals(
        balance,
        currency.decimals
      );

      if (normalizedBalance >= estimatedFeeWithBuffer) {
        return currency.feeCurrencyAddress as `0x${string}`;
      }
    } catch {
      // Skip currencies that are unsupported by wallet/network or missing balance for fees.
      continue;
    }
  }

  throw new Error(
    "No supported fee currency has enough balance to cover gas, or your wallet does not support Celo feeCurrency transactions. Use MiniPay/Valora and fund one of SUPPORTED_CURRENCIES."
  );
}
