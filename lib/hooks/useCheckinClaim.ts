"use client";

import { useEffect, useState } from "react";
import { encodeFunctionData } from "viem";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, usePublicClient, useWriteContract, useConnect } from "wagmi";

import { PAYOUT_CLAIMS_ABI } from "@/lib/config/payoutClaims";
import { isOnCorrectChain, PAYOUT_CLAIM_CONTRACT, PREFERRED_CHAIN } from "@/lib/config/wagmi";
import { selectSupportedFeeCurrency } from "@/lib/utils/feeCurrency";

interface ClaimPayload {
  user: `0x${string}`;
  day: number;
  nonce: string;
  deadline: number;
  signature: `0x${string}`;
}

export function useCheckinClaim() {
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: txHash, isPending, mutateAsync: sendTransaction } = useWriteContract();
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

    if (!publicClient) {
      throw new Error("Blockchain client unavailable. Please retry.");
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

    const data = encodeFunctionData({
      abi: PAYOUT_CLAIMS_ABI,
      functionName: "claimDailyCheckIn",
      args: [BigInt(payload.day), BigInt(payload.nonce), BigInt(payload.deadline), payload.signature],
    });

    console.info("[ClaimFlow][useCheckinClaim] encodedFunctionData", {
      functionName: "claimDailyCheckIn",
      args: {
        day: payload.day,
        nonce: payload.nonce,
        deadline: payload.deadline,
        signature: payload.signature,
      },
      data,
    });

    const feeCurrency = await selectSupportedFeeCurrency({
      publicClient,
      account: address as `0x${string}`,
      to: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
      data,
    });

    logClaimFlow("sendClaim.feeCurrency.selected", {
      connectedAddress: address,
      feeCurrency,
      contract: PAYOUT_CLAIM_CONTRACT,
      callDataLength: data.length,
    });

    const txRequest = {
      account: address as `0x${string}`,
      to: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
      data,
      feeCurrency,
    };

    logClaimFlow("sendClaim.txRequest.full", {
      txRequest,
      txParams: {
        account: txRequest.account,
        to: txRequest.to,
        data: txRequest.data,
        dataLength: txRequest.data.length,
        feeCurrency: txRequest.feeCurrency,
        chainId,
        value: "0x0 (implicit default)",
      },
      claimFunction: "claimDailyCheckIn",
      claimArgs: {
        day: payload.day,
        nonce: payload.nonce,
        deadline: payload.deadline,
        signature: payload.signature,
        signatureLength: payload.signature.length,
      },
    });

    setClaimError(null);

    try {
      logClaimFlow("sendClaim.submit", {
        connectedAddress: address,
        contract: PAYOUT_CLAIM_CONTRACT,
      });

      await sendTransaction({
        abi: PAYOUT_CLAIMS_ABI,
        functionName: "claimDailyCheckIn",
        args: [BigInt(payload.day), BigInt(payload.nonce), BigInt(payload.deadline), payload.signature],
        address: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
        feeCurrency,
      });

      logClaimFlow("sendClaim.submitted", {
        connectedAddress: address,
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
