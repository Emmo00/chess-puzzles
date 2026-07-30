"use client";

import { useState } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useSendTransaction,
  usePublicClient,
} from "wagmi";
import { encodeFunctionData, parseUnits, formatUnits } from "viem";
import { CUSD_ABI, getCUSDAddress, PAYMENT_RECIPIENT } from "../utils/payment";
import { PaymentType } from "../types/payment";
import { isOnCorrectChain, ALLOWLISTED_STABLECOINS, SUPPORTED_CURRENCIES } from "../config/wagmi";

export interface PaymentMeta {
  itemId?: string;
  itemCategory?: string;
  itemName?: string;
  itemQuantity?: number;
}

export interface PaymentQuote {
  selectedToken: (typeof ALLOWLISTED_STABLECOINS)[number];
  itemPrice: string;
  estimatedGasFee: string;
  totalRequired: string;
  balance: string;
  sufficient: boolean;
  allBalances: { symbol: string; balance: string }[];
}

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

const FEE_ABSTRACTION_GAS_OVERHEAD = BigInt(50000);
const GAS_SAFETY_NUMERATOR = BigInt(12);
const GAS_SAFETY_DENOMINATOR = BigInt(10);

export function usePayment() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { sendTransaction, data: hash, isPending } = useSendTransaction();
  const [paymentType, setPaymentType] = useState<PaymentType | null>(null);
  const [amountUsd, setAmountUsd] = useState<string | null>(null);
  const [paymentMeta, setPaymentMeta] = useState<PaymentMeta | null>(null);
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string | null>(null);

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const fetchBalances = async () => {
    if (!address || !publicClient) throw new Error("Wallet not connected");
    const results = await Promise.allSettled(
      ALLOWLISTED_STABLECOINS.map((c) =>
        publicClient.readContract({
          address: c.tokenAddress as `0x${string}`,
          abi: ERC20_BALANCE_ABI,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        })
      )
    );
    return ALLOWLISTED_STABLECOINS.map((c, i) => ({
      ...c,
      balance: results[i].status === "fulfilled" ? (results[i].value as bigint) : BigInt(0),
    }));
  };

  const quotePayment = async (
    usdAmount: string
  ): Promise<PaymentQuote> => {
    if (!address || !chainId || !publicClient) {
      throw new Error("Wallet not connected");
    }

    if (!isOnCorrectChain(chainId)) {
      throw new Error("Please switch to Celo network to make payments");
    }

    const balances = await fetchBalances();
    const sorted = [...balances].sort((a, b) => {
      const aNormed =
        a.decimals === 18 ? a.balance : a.balance * 10n ** BigInt(18 - a.decimals);
      const bNormed =
        b.decimals === 18 ? b.balance : b.balance * 10n ** BigInt(18 - b.decimals);
      if (bNormed > aNormed) return 1;
      if (bNormed < aNormed) return -1;
      return 0;
    });

    const selected = sorted[0];
    const priceBig = parseUnits(usdAmount, selected.decimals);

    // Estimate gas for the transfer
    const cusdAddress = getCUSDAddress(chainId);
    const data = encodeFunctionData({
      abi: CUSD_ABI,
      functionName: "transfer",
      args: [PAYMENT_RECIPIENT, priceBig],
    });

    let gasFee = BigInt(0);
    try {
      const baseGas = await publicClient.estimateGas({
        account: address as `0x${string}`,
        to: cusdAddress as `0x${string}`,
        data,
      });
      const effectiveGas = baseGas + FEE_ABSTRACTION_GAS_OVERHEAD;

      let gasPrice = BigInt(0);
      try {
        gasPrice = await (publicClient as any).request({
          method: "eth_gasPrice",
          params: [selected.feeCurrencyAddress],
        });
      } catch {
        gasPrice = await publicClient.request({
          method: "eth_gasPrice",
        });
      }

      gasFee =
        (effectiveGas * gasPrice * GAS_SAFETY_NUMERATOR) /
        GAS_SAFETY_DENOMINATOR;
    } catch {
      // If estimation fails, skip gas fee estimate
    }

    const totalRequired = priceBig + gasFee;
    const sufficient = selected.balance >= totalRequired;

    const allBalances = balances.map((b) => ({
      symbol: b.symbol,
      balance: formatUnits(b.balance, b.decimals),
    }));

    return {
      selectedToken: selected,
      itemPrice: formatUnits(priceBig, selected.decimals),
      estimatedGasFee: formatUnits(gasFee, selected.decimals),
      totalRequired: formatUnits(totalRequired, selected.decimals),
      balance: formatUnits(selected.balance, selected.decimals),
      sufficient,
      allBalances,
    };
  };

  const makePayment = async (
    type: PaymentType,
    usdAmount: string = "0.01",
    meta?: PaymentMeta,
    tokenAddress?: string
  ) => {
    if (!address || !chainId) {
      throw new Error("Wallet not connected");
    }

    if (!isOnCorrectChain(chainId)) {
      throw new Error("Please switch to Celo network to make payments");
    }

    try {
      setPaymentType(type);
      setAmountUsd(usdAmount);
      setPaymentMeta(meta || null);
      setSelectedTokenAddress(tokenAddress || null);

      const token = SUPPORTED_CURRENCIES.find(
        (c) => c.tokenAddress === (tokenAddress || ALLOWLISTED_STABLECOINS[0].tokenAddress)
      );
      if (!token) throw new Error("Unsupported token");

      const amount = parseUnits(usdAmount, token.decimals);

      const data = encodeFunctionData({
        abi: CUSD_ABI,
        functionName: "transfer",
        args: [PAYMENT_RECIPIENT, amount],
      });

      if (!publicClient) {
        throw new Error("Blockchain client unavailable. Please retry.");
      }

      await sendTransaction({
        account: address,
        to: token.tokenAddress as `0x${string}`,
        data,
        feeCurrency: token.feeCurrencyAddress as `0x${string}`,
      });
    } catch (error) {
      setPaymentType(null);
      setAmountUsd(null);
      setPaymentMeta(null);
      setSelectedTokenAddress(null);
      throw error;
    }
  };

  const verifyPayment = async (maxRetries = 5) => {
    if (!hash || !address || !chainId || !paymentType) {
      return false;
    }

    let retries = 0;

    while (retries <= maxRetries) {
      try {
        const body: Record<string, unknown> = {
          transactionHash: hash,
          walletAddress: address,
          paymentType,
          chainId,
          amountUsd,
          tokenAddress: selectedTokenAddress,
        };
        if (paymentMeta) {
          body.metadata = paymentMeta;
        }

        const response = await fetch("/api/payments/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const result = await response.json();
          setPaymentType(null);
          setAmountUsd(null);
          setPaymentMeta(null);
          setSelectedTokenAddress(null);
          return result.verified;
        } else if (response.status === 202) {
          const result = await response.json();
          console.log("Transaction still processing, retrying...", result.error);

          if (retries < maxRetries) {
            retries++;
            await new Promise((resolve) => setTimeout(resolve, 3000));
            continue;
          } else {
            throw new Error(
              "Transaction verification timed out. Please check your transaction status manually."
            );
          }
        } else {
          const errorResult = await response.json();
          throw new Error(errorResult.error || "Payment verification failed");
        }
      } catch (error) {
        console.error("Payment verification error:", error);

        if (
          retries < maxRetries &&
          error instanceof Error &&
          error.message.includes("still being processed")
        ) {
          retries++;
          await new Promise((resolve) => setTimeout(resolve, 3000));
          continue;
        }

        setPaymentType(null);
        setAmountUsd(null);
        setPaymentMeta(null);
        setSelectedTokenAddress(null);
        throw error;
      }
    }

    return false;
  };

  return {
    makePayment,
    verifyPayment,
    quotePayment,
    isPaymentPending: isPending,
    isConfirming,
    isSuccess,
    transactionHash: hash,
    paymentType,
    amountUsd,
  };
}
