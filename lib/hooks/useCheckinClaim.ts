"use client";

import { useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { erc20Abi } from "viem";
import { PAYOUT_CLAIMS_ABI } from "@/lib/config/payoutClaims";
import { PAYOUT_CLAIM_CONTRACT, SUPPORTED_CURRENCIES } from "@/lib/config/wagmi";
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

  const logClaimFlow = (step: string, details?: Record<string, unknown>) => {
    console.info("[ClaimFlow][useCheckinClaim]", step, details || {});
  };

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

  const selectFeeCurrency = async (claim: ClaimPayload, gasEstimate: bigint): Promise<{ feeCurrency?: `0x${string}`; gas?: bigint } | "insufficient"> => {
    if (!address || !publicClient) {
      return "insufficient";
    }

    try {
      const feeCurrencyCandidates = SUPPORTED_CURRENCIES.filter(
        (c) => c.feeCurrencyAddress && ["USDm", "USDC", "USDT", "cEUR", "cREAL"].includes(c.symbol)
      );

      const balances = await Promise.all(
        feeCurrencyCandidates.map(async (currency) => {
          try {
            const balance = await publicClient.readContract({
              address: currency.tokenAddress as `0x${string}`,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [address],
            });
            return { currency, balance };
          } catch {
            return { currency, balance: 0n };
          }
        })
      );

      const gasWithBuffer = (gasEstimate * BigInt(15)) / BigInt(10);

      const sorted = balances
        .filter((b) => b.balance > 0)
        .sort((a, b) => {
          const aNormed =
            a.currency.decimals === 18
              ? a.balance
              : a.balance * 10n ** BigInt(18 - a.currency.decimals);
          const bNormed =
            b.currency.decimals === 18
              ? b.balance
              : b.balance * 10n ** BigInt(18 - b.currency.decimals);
          return bNormed > aNormed ? 1 : -1;
        });

      for (const { currency, balance } of sorted) {
        if (balance >= gasWithBuffer) {
          logClaimFlow("feeCurrency.selected", {
            symbol: currency.symbol,
            balance: balance.toString(),
            gasEstimate: gasEstimate.toString(),
          });
          return {
            feeCurrency: currency.feeCurrencyAddress as `0x${string}`,
            gas: gasWithBuffer,
          };
        }
      }

      logClaimFlow("feeCurrency.insufficient", { reason: "no_token_covers_gas" });
      return "insufficient";
    } catch (error: any) {
      logClaimFlow("feeCurrency.error", { message: error?.message });
      return "insufficient";
    }
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

    try {
      const claim = await fetchClaimPayload(requestId);

      // Estimate gas with the real claim payload
      let gasEstimate: bigint;
      try {
        gasEstimate = await publicClient!.estimateContractGas({
          account: address,
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
        });
      } catch {
        throw new Error("Failed to estimate gas for claim transaction");
      }

      const feeOption = await selectFeeCurrency(claim, gasEstimate);

      if (feeOption === "insufficient") {
        throw new Error(
          "Insufficient balance to pay network fee. Top up with USDC, USDT, or USDm to claim your reward."
        );
      }

      logClaimFlow("sendClaim.wallet.request", {
        requestId,
        user: claim.user,
        day: claim.day,
        nonce: claim.nonce,
        deadline: claim.deadline,
        feeCurrency: feeOption.feeCurrency,
      });

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

      if (feeOption.feeCurrency) {
        txArgs.feeCurrency = feeOption.feeCurrency;
      }

      txArgs.type = "legacy";

      const submittedTxHash = await writeContractAsync(txArgs);

      logClaimFlow("sendClaim.wallet.submitted", {
        requestId,
        txHash: submittedTxHash,
      });

      setTxHash(submittedTxHash);
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
