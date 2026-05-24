"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { encodeFunctionData, erc20Abi } from "viem";

import revenueCollectorAbiJson from "@/abis/revenue-receiver.json";
import { FREE_DAILY_PUZZLE_LIMIT, getPremiumPlan } from "../config/premium";
import { isOnCorrectChain } from "../config/wagmi";
import { PaymentType } from "../types/payment";
import {
  CUSD_ABI,
  getCUSDAddress,
  PAYMENT_AMOUNTS,
  PAYMENT_RECIPIENT,
  REVENUE_COLLECTOR_CONTRACT,
} from "../utils/payment";
import { selectSupportedFeeCurrency } from "@/lib/utils/feeCurrency";

type RevenueCollectorAbi = typeof revenueCollectorAbiJson;

const revenueCollectorAbi = revenueCollectorAbiJson as RevenueCollectorAbi;

type PaymentPhase = "idle" | "approving" | "depositing" | "confirming";

export function usePayment() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [paymentType, setPaymentType] = useState<PaymentType | null>(null);
  const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>("idle");
  const [submittedHash, setSubmittedHash] = useState<`0x${string}` | undefined>(undefined);

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: submittedHash,
  });

  const resetPaymentState = () => {
    setPaymentType(null);
    setPaymentPhase("idle");
    setSubmittedHash(undefined);
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

      const cusdAddress = getCUSDAddress(chainId);

      if (type === PaymentType.DAILY_ACCESS) {
        const amount = PAYMENT_AMOUNTS.DAILY_ACCESS;
        const data = encodeFunctionData({
          abi: CUSD_ABI,
          functionName: "transfer",
          args: [PAYMENT_RECIPIENT, amount],
        });

        const feeCurrency = await selectSupportedFeeCurrency({
          publicClient,
          account: address as `0x${string}`,
          to: cusdAddress as `0x${string}`,
          data,
        });

        setPaymentPhase("confirming");
        const hash = await writeContractAsync({
          account: address,
          address: cusdAddress as `0x${string}`,
          abi: CUSD_ABI,
          functionName: "transfer",
          args: [PAYMENT_RECIPIENT as `0x${string}`, amount],
          feeCurrency,
        });

        setSubmittedHash(hash);
        return hash;
      }

      const plan = getPremiumPlan(type);
      if (!plan) {
        throw new Error("Unsupported payment plan");
      }

      if (!REVENUE_COLLECTOR_CONTRACT) {
        throw new Error("Revenue collector contract is not configured");
      }

      const amount = plan.amount;
      const collectorAddress = REVENUE_COLLECTOR_CONTRACT as `0x${string}`;
      const cusdContract = cusdAddress as `0x${string}`;

      setPaymentPhase("approving");
      const approvalHash = await writeContractAsync({
        account: address,
        address: cusdContract,
        abi: erc20Abi,
        functionName: "approve",
        args: [collectorAddress, amount],
      });

      await publicClient.waitForTransactionReceipt({
        hash: approvalHash,
      });

      setPaymentPhase("depositing");
      const depositData = encodeFunctionData({
        abi: revenueCollectorAbi,
        functionName: "deposit",
        args: [cusdContract, amount],
      });

      const feeCurrency = await selectSupportedFeeCurrency({
        publicClient,
        account: address as `0x${string}`,
        to: collectorAddress,
        data: depositData,
      });

      const depositHash = await writeContractAsync({
        account: address,
        address: collectorAddress,
        abi: revenueCollectorAbi,
        functionName: "deposit",
        args: [cusdContract, amount],
        feeCurrency,
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
            result.error || "Transaction verification timed out. Please check your transaction status manually."
          );
        }

        const errorResult = await response.json();
        throw new Error(errorResult.error || "Payment verification failed");
      } catch (error) {
        if (retries < maxRetries && error instanceof Error && error.message.includes("still being processed")) {
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
    isPaymentPending: paymentPhase === "approving" || paymentPhase === "depositing",
    isConfirming,
    isSuccess,
    transactionHash: submittedHash,
    paymentType,
    paymentPhase,
    freePuzzleLimit: FREE_DAILY_PUZZLE_LIMIT,
  };
}
