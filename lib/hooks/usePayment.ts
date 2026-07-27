"use client";

import { useState } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useSendTransaction,
  usePublicClient,
} from "wagmi";
import { encodeFunctionData, parseUnits } from "viem";
import { CUSD_ABI, getCUSDAddress, PAYMENT_RECIPIENT } from "../utils/payment";
import { PaymentType } from "../types/payment";
import { isOnCorrectChain } from "../config/wagmi";
import { selectSupportedFeeCurrency } from "@/lib/utils/feeCurrency";

export interface PaymentMeta {
  itemId?: string;
  itemCategory?: string;
  itemName?: string;
  itemQuantity?: number;
}

export function usePayment() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { sendTransaction, data: hash, isPending } = useSendTransaction();
  const [paymentType, setPaymentType] = useState<PaymentType | null>(null);
  const [amountUsd, setAmountUsd] = useState<string | null>(null);
  const [paymentMeta, setPaymentMeta] = useState<PaymentMeta | null>(null);

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const makePayment = async (
    type: PaymentType,
    usdAmount: string = "0.01",
    meta?: PaymentMeta
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
      const cusdAddress = getCUSDAddress(chainId);
      const amount = parseUnits(usdAmount, 18);

      const data = encodeFunctionData({
        abi: CUSD_ABI,
        functionName: "transfer",
        args: [PAYMENT_RECIPIENT, amount],
      });

      if (!publicClient) {
        throw new Error("Blockchain client unavailable. Please retry.");
      }

      const feeCurrency = await selectSupportedFeeCurrency({
        publicClient,
        account: address as `0x${string}`,
        to: cusdAddress as `0x${string}`,
        data,
      });

      await sendTransaction({
        account: address,
        to: cusdAddress as `0x${string}`,
        data,
        feeCurrency,
      });
    } catch (error) {
      setPaymentType(null);
      setAmountUsd(null);
      setPaymentMeta(null);
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
        throw error;
      }
    }

    return false;
  };

  return {
    makePayment,
    verifyPayment,
    isPaymentPending: isPending,
    isConfirming,
    isSuccess,
    transactionHash: hash,
    paymentType,
    amountUsd,
  };
}
