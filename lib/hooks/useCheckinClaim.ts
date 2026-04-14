"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
} from "wagmi";
import { PAYOUT_CLAIM_CONTRACT } from "@/lib/config/wagmi";

interface ClaimPayload {
  user: `0x${string}`;
  day: number;
  nonce: string;
  deadline: number;
  signature: `0x${string}`;
}

export function useCheckinClaim() {
  const { address } = useAccount();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [isPending, setIsPending] = useState(false);
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const [claimError, setClaimError] = useState<string | null>(null);

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
    });
  }, [txHash, isPending, isConfirming, isSuccess, claimError]);

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

    logClaimFlow("sendClaim.sponsored.request", {
      requestId,
      contract: PAYOUT_CLAIM_CONTRACT,
      claimFunction: "claimDailyCheckIn",
    });

    setClaimError(null);
    setIsPending(true);

    try {
      const response = await fetch("/api/checkin/claim/sponsored", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${address}`,
          "x-claim-debug-id": requestId,
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

      setTxHash(relayResult.txHash as `0x${string}`);

      logClaimFlow("sendClaim.submitted", {
        requestId,
        connectedAddress: address,
        txHash: relayResult.txHash,
        contract: PAYOUT_CLAIM_CONTRACT,
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
    isPending,
    isConfirming,
    isSuccess,
  };
}
