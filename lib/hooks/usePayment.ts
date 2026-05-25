"use client";

import { useState } from "react";
import {
  useAccount,
  useConfig,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { encodeFunctionData, erc20Abi, parseUnits } from "viem";

import revenueCollectorAbiJson from "@/abis/revenue-receiver.json";
import {
  FREE_DAILY_PUZZLE_LIMIT,
  PAYMENT_PRICES,
  getPremiumPlan,
} from "../config/premium";
import { isOnCorrectChain } from "../config/wagmi";
import { PaymentType } from "../types/payment";
import {
  CUSD_ABI,
  SUPPORTED_STABLES,
  PAYMENT_RECIPIENT,
  REVENUE_COLLECTOR_CONTRACT,
} from "../utils/payment";
import { selectSupportedFeeCurrency } from "@/lib/utils/feeCurrency";

type RevenueCollectorAbi = typeof revenueCollectorAbiJson;

const revenueCollectorAbi = revenueCollectorAbiJson as RevenueCollectorAbi;

type PaymentPhase =
  | "idle"
  | "signing-approve"
  | "approving"
  | "signing-deposit"
  | "depositing"
  | "confirming";

export function usePayment() {
  const config = useConfig();
  const { address, chainId, connector } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [paymentType, setPaymentType] = useState<PaymentType | null>(null);
  const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>("idle");
  const [submittedHash, setSubmittedHash] = useState<`0x${string}` | undefined>(
    undefined,
  );
  const [usedTokenAddress, setUsedTokenAddress] = useState<string | undefined>(
    undefined,
  );

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: submittedHash,
  });

  const resetPaymentState = () => {
    setPaymentType(null);
    setPaymentPhase("idle");
    setSubmittedHash(undefined);
    setUsedTokenAddress(undefined);
  };

  // Return the preferred token (highest balance) without performing payment
  const getPreferredToken = async () => {
    if (!address || !publicClient) return null;
    const balances: Array<{ token: any; balance: bigint; normalized: number }> =
      [];

    for (const token of SUPPORTED_STABLES) {
      try {
        const bal: bigint = await publicClient.readContract({
          address: token.tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        });
        const normalized = Number(bal) / Math.pow(10, token.decimals);
        balances.push({ token, balance: bal, normalized });
      } catch (e) {
        balances.push({ token, balance: BigInt(0), normalized: 0 });
      }
    }

    balances.sort((a, b) => b.normalized - a.normalized);
    return balances[0]?.token ?? null;
  };

  const makePayment = async (type: PaymentType) => {
    if (!address || !chainId) {
      throw new Error("Wallet not connected");
    }

    if (!isOnCorrectChain(chainId)) {
      throw new Error("Please switch to Celo network to make payments");
    }

    if (!publicClient) {
      throw new Error("Blockchain client unavailable. Please retry.");
    }

    try {
      setPaymentType(type);
      setSubmittedHash(undefined);

      // Helper: find token with the highest balance for the connected user
      const balances: Array<{
        token: any;
        balance: bigint;
        normalized: number;
      }> = [];

      for (const token of SUPPORTED_STABLES) {
        try {
          const bal: bigint = await publicClient.readContract({
            address: token.tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address as `0x${string}`],
          });
          const normalized = Number(bal) / Math.pow(10, token.decimals);
          balances.push({ token, balance: bal, normalized });
        } catch (e) {
          // ignore read errors and treat as zero
          balances.push({ token, balance: BigInt(0), normalized: 0 });
        }
      }

      // pick token with highest normalized balance
      balances.sort((a, b) => b.normalized - a.normalized);
      const preferred = balances[0];

      // Determine required amount (smallest units) for this payment type
      const price = PAYMENT_PRICES[type];
      const decimals = preferred?.token?.decimals ?? 18;
      const requiredAmount = parseUnits(String(price), decimals);

      if (!preferred || BigInt(preferred.balance) < BigInt(requiredAmount)) {
        // if user doesn't have sufficient balance in their top token, check others
        const sufficient = balances.find(
          (b) =>
            BigInt(b.balance) >=
            BigInt(parseUnits(String(price), b.token.decimals)),
        );
        if (sufficient) {
          // use the sufficient token
          preferred.token = sufficient.token;
        } else {
          throw new Error(
            "INSUFFICIENT_BALANCE: Please top up one of the supported stable coins (USDT, USDC, cUSD).",
          );
        }
      }

      const tokenAddress = preferred.token.tokenAddress as `0x${string}`;
      const tokenDecimals = preferred.token.decimals;
      const smallestAmount = parseUnits(String(price), tokenDecimals);

      // Store the token address for verification
      setUsedTokenAddress(tokenAddress);

      // Premium plans: approve + deposit to revenue collector
      const plan = getPremiumPlan(type);
      if (!plan) {
        throw new Error("Unsupported payment plan");
      }

      if (!REVENUE_COLLECTOR_CONTRACT) {
        throw new Error("Revenue collector contract is not configured");
      }

      const collectorAddress = REVENUE_COLLECTOR_CONTRACT as `0x${string}`;

      if (!connector) {
        throw new Error("Wallet connector unavailable");
      }

      const approveData = encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [collectorAddress, smallestAmount],
      });

      const feeCurrency = await selectSupportedFeeCurrency({
        publicClient,
        account: address as `0x${string}`,
        to: tokenAddress,
        data: approveData,
      });

      setPaymentPhase("signing-approve");
      const approvalHash = await writeContractAsync({
        account: address,
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [collectorAddress, smallestAmount],
        feeCurrency,
      });

      setPaymentPhase("approving");
      await publicClient.waitForTransactionReceipt({
        hash: approvalHash,
      });

      setPaymentPhase("signing-deposit");
      const depositData = encodeFunctionData({
        abi: revenueCollectorAbi,
        functionName: "deposit",
        args: [tokenAddress, smallestAmount],
      });

      const depositFeeCurrency = await selectSupportedFeeCurrency({
        publicClient,
        account: address as `0x${string}`,
        to: collectorAddress,
        data: depositData,
      });

      setPaymentPhase("depositing");
      const depositHash = await writeContractAsync({
        account: address,
        address: collectorAddress,
        abi: revenueCollectorAbi,
        functionName: "deposit",
        args: [tokenAddress, smallestAmount],
        feeCurrency: depositFeeCurrency,
      });

      setPaymentPhase("confirming");
      setSubmittedHash(depositHash);
      return depositHash;
    } catch (error) {
      resetPaymentState();
      throw error;
    }
  };

  const verifyPayment = async (maxRetries = 5) => {
    if (!submittedHash || !address || !chainId || !paymentType) {
      return false;
    }

    let retries = 0;

    while (retries <= maxRetries) {
      try {
        const response = await fetch("/api/payments/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transactionHash: submittedHash,
            walletAddress: address,
            paymentType,
            chainId,
            tokenAddress: usedTokenAddress,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          resetPaymentState();
          return result.verified;
        }

        if (response.status === 202) {
          const result = await response.json();

          if (retries < maxRetries) {
            retries++;
            await new Promise((resolve) => setTimeout(resolve, 3000));
            continue;
          }

          throw new Error(
            result.error ||
              "Transaction verification timed out. Please check your transaction status manually.",
          );
        }

        const errorResult = await response.json();
        throw new Error(errorResult.error || "Payment verification failed");
      } catch (error) {
        if (
          retries < maxRetries &&
          error instanceof Error &&
          error.message.includes("still being processed")
        ) {
          retries++;
          await new Promise((resolve) => setTimeout(resolve, 3000));
          continue;
        }

        resetPaymentState();
        throw error;
      }
    }

    return false;
  };

  return {
    makePayment,
    verifyPayment,
    getPreferredToken,
    isPaymentPending:
      paymentPhase === "signing-approve" ||
      paymentPhase === "approving" ||
      paymentPhase === "signing-deposit" ||
      paymentPhase === "depositing",
    isConfirming,
    isSuccess,
    transactionHash: submittedHash,
    paymentType,
    paymentPhase,
    freePuzzleLimit: FREE_DAILY_PUZZLE_LIMIT,
  };
}
