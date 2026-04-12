"use client";

import { useState } from "react";
import { encodeFunctionData } from "viem";
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";

import { PAYOUT_CLAIMS_ABI } from "@/lib/config/payoutClaims";
import {
  isOnCorrectChain,
  PAYOUT_CLAIM_CONTRACT,
  PREFERRED_CHAIN,
} from "@/lib/config/wagmi";
import { selectSupportedFeeCurrency } from "@/lib/utils/feeCurrency";

interface ClaimPayload {
  day: number;
  nonce: string;
  deadline: number;
  signature: `0x${string}`;
}

export function useCheckinClaim() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { sendTransaction, data: txHash, isPending } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const [claimError, setClaimError] = useState<string | null>(null);

  const sendClaim = async (payload: ClaimPayload) => {
    if (!address || !chainId) {
      throw new Error("Wallet not connected");
    }

    if (!isOnCorrectChain(chainId)) {
      throw new Error(`Please switch to Celo network (${PREFERRED_CHAIN.name})`);
    }

    if (!publicClient) {
      throw new Error("Blockchain client unavailable. Please retry.");
    }

    const data = encodeFunctionData({
      abi: PAYOUT_CLAIMS_ABI,
      functionName: "claimDailyCheckIn",
      args: [
        BigInt(payload.day),
        BigInt(payload.nonce),
        BigInt(payload.deadline),
        payload.signature,
      ],
    });

    const feeCurrency = await selectSupportedFeeCurrency({
      publicClient,
      account: address as `0x${string}`,
      to: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
      data,
    });

    setClaimError(null);

    try {
      await sendTransaction({
        account: address,
        to: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
        data,
        feeCurrency,
      });
    } catch (error: any) {
      const message = error?.shortMessage || error?.message || "Claim transaction failed";
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
