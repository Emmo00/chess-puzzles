"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { erc20Abi } from "viem";
import { PAYOUT_CLAIMS_ABI } from "@/lib/config/payoutClaims";
import { PAYOUT_CLAIM_CONTRACT, isMiniPay, SUPPORTED_CURRENCIES } from "@/lib/config/wagmi";
import {
  DEVICE_FINGERPRINT_HEADER,
  getDeviceFingerprint,
} from "@/lib/utils/deviceFingerprint";

interface ClaimPayload {
  user: `0x${string}`;
  day: number;
  nonce: string;
  deadline: number;
  signature: `0x${string}`;
}

export function useCheckinClaim() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [isPending, setIsPending] = useState(false);
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const [claimError, setClaimError] = useState<string | null>(null);
  const [submissionMode, setSubmissionMode] = useState<"wallet" | "sponsored" | null>(null);

  const logClaimFlow = (step: string, details?: Record<string, unknown>) => {
    console.info("[ClaimFlow][useCheckinClaim]", step, details || {});
  };

  useEffect(() => {
    logClaimFlow("tx.state", {
      txHash,
      isPending,
      isConfirming,
      isSuccess,
      claimError,
      submissionMode,
    });
  }, [txHash, isPending, isConfirming, isSuccess, claimError, submissionMode]);

  const fetchClaimPayload = async (requestId: string): Promise<ClaimPayload> => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    const response = await fetch("/api/checkin/claim/payload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${address}`,
        "x-claim-debug-id": requestId,
        [DEVICE_FINGERPRINT_HEADER]: getDeviceFingerprint(),
      },
    });

    const data = await response.json();

    if (!response.ok || !data?.claim) {
      throw new Error(data?.message || "Failed to fetch claim payload");
    }

    return data.claim as ClaimPayload;
  };

  const checkPaymentOptions = async (claim: ClaimPayload): Promise<{ canSendFromWallet: boolean; feeCurrency?: `0x${string}` }> => {
    if (!address || !publicClient) {
      return { canSendFromWallet: false };
    }

    try {
      const args = [
        claim.user,
        BigInt(claim.day),
        BigInt(claim.nonce),
        BigInt(claim.deadline),
        claim.signature,
      ] as const;

      const [balance, gasPrice, gasEstimate] = await Promise.all([
        publicClient.getBalance({ address }),
        publicClient.getGasPrice(),
        publicClient.estimateContractGas({
          account: address,
          address: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
          abi: PAYOUT_CLAIMS_ABI,
          functionName: "claimDailyCheckIn",
          args,
        }),
      ]);

      const estimatedCost = gasEstimate * gasPrice;
      // Add 20% headroom to reduce false positives on volatile gas.
      const requiredCost = (estimatedCost * BigInt(12)) / BigInt(10);

      if (isMiniPay()) {
        for (const currency of SUPPORTED_CURRENCIES) {
          try {
            const tokenBalance = await publicClient.readContract({
              address: currency.tokenAddress as `0x${string}`,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [address],
            });

            // Adjust required cost for decimal differences
            const scaleFactor = BigInt(10) ** BigInt(18 - currency.decimals);
            const tokenRequiredCost = requiredCost / scaleFactor;

            if (tokenBalance >= tokenRequiredCost) {
              logClaimFlow("sendClaim.feeAbstraction", {
                token: currency.symbol,
                balance: tokenBalance.toString(),
                required: tokenRequiredCost.toString(),
              });
              return {
                canSendFromWallet: true,
                feeCurrency: currency.feeCurrencyAddress as `0x${string}`,
              };
            }
          } catch (e) {
            console.error(`[ClaimFlow] Error checking balance for ${currency.symbol}`, e);
          }
        }
        
        // If we reach here, they don't have enough stablecoins
        logClaimFlow("sendClaim.minipay.insufficientFunds", {
          reason: "no_sufficient_stablecoin_balance",
        });
        return { canSendFromWallet: false };
      }

      logClaimFlow("sendClaim.balanceCheck", {
        balanceWei: balance.toString(),
        gasPriceWei: gasPrice.toString(),
        gasEstimate: gasEstimate.toString(),
        requiredCostWei: requiredCost.toString(),
      });

      return { canSendFromWallet: balance >= requiredCost };
    } catch (error: any) {
      logClaimFlow("sendClaim.balanceCheck.error", {
        message: error?.message,
      });
      return { canSendFromWallet: false };
    }
  };

  const submitSponsoredClaim = async (requestId: string) => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    const response = await fetch("/api/checkin/claim/sponsored", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${address}`,
        "x-claim-debug-id": requestId,
        [DEVICE_FINGERPRINT_HEADER]: getDeviceFingerprint(),
      },
    });

    const relayResult = await response.json();

    logClaimFlow("sendClaim.sponsored.response", {
      requestId,
      status: response.status,
      ok: response.ok,
      relayResult,
    });

    if (!response.ok || !relayResult?.txHash) {
      throw new Error(relayResult?.message || "Sponsored transaction submission failed");
    }

    return relayResult.txHash as `0x${string}`;
  };

  const sendClaim = async () => {
    logClaimFlow("sendClaim.start", {
      connectedAddress: address,
    });

    if (!address) {
      throw new Error("Wallet not connected");
    }
    const requestId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `claim-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    logClaimFlow("sendClaim.request", {
      requestId,
      contract: PAYOUT_CLAIM_CONTRACT,
      claimFunction: "claimDailyCheckIn",
    });

    setClaimError(null);
    setIsPending(true);
    setSubmissionMode(null);

    try {
      const claim = await fetchClaimPayload(requestId);
      const paymentOption = await checkPaymentOptions(claim);

      let submittedTxHash: `0x${string}`;

      if (paymentOption.canSendFromWallet) {
        setSubmissionMode("wallet");
        logClaimFlow("sendClaim.wallet.request", {
          requestId,
          user: claim.user,
          day: claim.day,
          nonce: claim.nonce,
          deadline: claim.deadline,
          feeCurrency: paymentOption.feeCurrency,
        });

        // Use standard transaction or fee abstraction depending on feeCurrency
        const txArgs: any = {
          address: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
          abi: PAYOUT_CLAIMS_ABI,
          functionName: "claimDailyCheckIn",
          args: [
            claim.user,
            BigInt(claim.day),
            BigInt(claim.nonce),
            BigInt(claim.deadline),
            claim.signature,
          ],
        };

        if (paymentOption.feeCurrency) {
          txArgs.feeCurrency = paymentOption.feeCurrency;
        }

        submittedTxHash = await writeContractAsync(txArgs);

        logClaimFlow("sendClaim.wallet.submitted", {
          requestId,
          txHash: submittedTxHash,
        });
      } else {
        setSubmissionMode("sponsored");
        logClaimFlow("sendClaim.sponsored.request", {
          requestId,
          reason: "insufficient_funds_for_gas",
        });
        submittedTxHash = await submitSponsoredClaim(requestId);
      }

      setTxHash(submittedTxHash);

      logClaimFlow("sendClaim.submitted", {
        requestId,
        connectedAddress: address,
        txHash: submittedTxHash,
        contract: PAYOUT_CLAIM_CONTRACT,
        mode: paymentOption.canSendFromWallet ? "wallet" : "sponsored",
      });
    } catch (error: any) {
      const message = error?.shortMessage || error?.message || "Claim transaction failed";
      logClaimFlow("sendClaim.error", {
        message,
        shortMessage: error?.shortMessage,
        details: error?.details,
        cause: error?.cause?.message,
      });
      setClaimError(message);
      throw new Error(message);
    } finally {
      setIsPending(false);
    }
  };

  return {
    sendClaim,
    txHash,
    claimError,
    submissionMode,
    isPending,
    isConfirming,
    isSuccess,
  };
}

