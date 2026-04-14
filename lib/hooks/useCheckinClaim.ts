"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useSignMessage,
  useWaitForTransactionReceipt,
} from "wagmi";
import { isOnCorrectChain, PAYOUT_CLAIM_CONTRACT, PREFERRED_CHAIN } from "@/lib/config/wagmi";
import { buildSponsoredCheckinIntentMessage } from "@/lib/utils/checkinSponsoredIntent";

interface ClaimPayload {
  user: `0x${string}`;
  day: number;
  nonce: string;
  deadline: number;
  signature: `0x${string}`;
}

export function useCheckinClaim() {
  const { address, chainId, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
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

  const sendClaim = async (payload: ClaimPayload) => {
    logClaimFlow("sendClaim.start", {
      connectedAddress: address,
      chainId,
      payloadUser: payload.user,
      day: payload.day,
      nonce: payload.nonce,
      deadline: payload.deadline,
    });

    if (!address || !chainId) {
      throw new Error("Wallet not connected");
    }

    if (!isOnCorrectChain(chainId)) {
      throw new Error(`Please switch to Celo network (${PREFERRED_CHAIN.name})`);
    }

    if (payload.user.toLowerCase() !== address.toLowerCase()) {
      throw new Error("Claim payload wallet does not match the connected wallet. Refresh and try again.");
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.deadline <= now) {
      throw new Error("Claim signature expired. Please try claiming again.");
    }

    logClaimFlow("sendClaim.preflight.passed", {
      connectedAddress: address,
      payloadUser: payload.user,
      chainId,
      now,
      deadline: payload.deadline,
      secondsUntilExpiry: payload.deadline - now,
    });

    const intentMessage = buildSponsoredCheckinIntentMessage(payload);
    const requestId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `claim-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    logClaimFlow("sendClaim.intent.payload", {
      requestId,
      contract: PAYOUT_CLAIM_CONTRACT,
      chainId,
      claimFunction: "claimDailyCheckIn",
      claimArgs: {
        user: payload.user,
        day: payload.day,
        nonce: payload.nonce,
        deadline: payload.deadline,
        signature: payload.signature,
        signatureLength: payload.signature.length,
      },
      intentMessage,
    });

    setClaimError(null);
    setIsPending(true);

    try {
      const intentSignature = await signMessageAsync({
        account: address as `0x${string}`,
        message: intentMessage,
      });

      logClaimFlow("sendClaim.intent.signed", {
        requestId,
        connectedAddress: address,
        intentSignature,
      });

      const response = await fetch("/api/checkin/claim/sponsored", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${address}`,
          "x-claim-debug-id": requestId,
        },
        body: JSON.stringify({
          claim: payload,
          intentMessage,
          intentSignature,
        }),
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
