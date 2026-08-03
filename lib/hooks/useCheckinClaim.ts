"use client";

import { useState, useRef } from "react";
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { erc20Abi } from "viem";
import { celo } from "wagmi/chains";
import { PAYOUT_CLAIMS_ABI } from "@/lib/config/payoutClaims";
import { PAYOUT_CLAIM_CONTRACT, SUPPORTED_CURRENCIES, isMiniPay } from "@/lib/config/wagmi";
import { getLegacyGasPrice } from "@/lib/utils/minipayTx";
import {
  DEVICE_FINGERPRINT_HEADER,
  getDeviceFingerprint,
} from "@/lib/utils/deviceFingerprint";
import { runWithDevCapture, captureApiDevError } from "@/lib/utils/devStore";

const isOnCorrectChain = (chainId?: number): boolean => {
  if (!chainId) return false;
  return chainId === celo.id;
};

interface ClaimPayload {
  user: `0x${string}`;
  day: number;
  nonce: string;
  deadline: number;
  signature: `0x${string}`;
}

export function useCheckinClaim() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const { writeContractAsync, data: txHash } = useWriteContract();
  const [isPending, setIsPending] = useState(false);
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    timeout: 60_000,
  });
  const [claimError, setClaimError] = useState<string | null>(null);
  const inFlight = useRef(false);
  
  const isCorrectChain = isOnCorrectChain(chainId);
  const isSwitching = isSwitchingChain;

  const logClaimFlow = (step: string, details?: Record<string, unknown>) => {
    console.info("[ClaimFlow][useCheckinClaim]", step, details || {});
  };

  const ensureCorrectChain = async (): Promise<boolean> => {
    // MiniPay is always on Celo mainnet, and during SSR/hydration chainId is
    // undefined — both cases should short-circuit instead of requesting a
    // chain switch MiniPay may not implement.
    if (chainId === undefined || isMiniPay()) return true;
    if (isCorrectChain) return true;
    
    if (!address) {
      throw new Error("Wallet not connected");
    }
    
    try {
      await switchChain({ chainId: celo.id });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to switch to Celo Mainnet";
      setClaimError(message);
      throw new Error(message);
    }
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
      captureApiDevError("checkin.claim.payload", response, data);
      throw new Error(data?.message || "Failed to fetch claim payload");
    }

    return data.claim as ClaimPayload;
  };

  const selectFeeCurrency = async (claim: ClaimPayload, gasEstimate: bigint): Promise<{ feeCurrency: `0x${string}` } | "insufficient"> => {
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

      const gasWithBufferNumerator = gasEstimate * BigInt(15);
      const gasWithBufferDenominator = BigInt(10);

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
        try {
          // eth_gasPrice([feeCurrency]) returns the price in 1e-18 units
          // regardless of token decimals, so scale into token base units.
          const gasPrice = await getLegacyGasPrice(
            publicClient,
            currency.feeCurrencyAddress as `0x${string}`,
          );
          const feeInBaseUnits =
            (gasWithBufferNumerator * gasPrice) /
            (gasWithBufferDenominator *
              10n ** BigInt(18 - currency.decimals));
          if (balance >= feeInBaseUnits) {
            logClaimFlow("feeCurrency.selected", {
              symbol: currency.symbol,
              balance: balance.toString(),
              gasEstimate: gasEstimate.toString(),
              feeInBaseUnits: feeInBaseUnits.toString(),
            });
            return {
              feeCurrency: currency.feeCurrencyAddress as `0x${string}`,
            };
          }
        } catch {
          continue;
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
    if (inFlight.current) return;
    inFlight.current = true;

    // Ensure user is on Celo Mainnet before proceeding
    await ensureCorrectChain();

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

      // Estimate gas with feeCurrency — MiniPay requires explicit gas when
      // using CIP-64, otherwise eth_estimateGas returns "permission denied".
      let claimGas: bigint | undefined;
      try {
        const g = await publicClient!.estimateContractGas({
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
          ...({ feeCurrency: feeOption.feeCurrency } as any),
        });
        claimGas = (g * 12n) / 10n;
      } catch {
        try {
          const g = await publicClient!.estimateContractGas({
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
          claimGas = (g * 12n) / 10n + 60_000n;
        } catch {
          claimGas = 300_000n;
        }
      }

      const claimTxRequest = {
        address: PAYOUT_CLAIM_CONTRACT,
        abi: PAYOUT_CLAIMS_ABI,
        functionName: "claimDailyCheckIn",
        args: [
          claim.user,
          BigInt(claim.day),
          BigInt(claim.nonce),
          BigInt(claim.deadline),
          claim.signature,
        ],
        feeCurrency: feeOption.feeCurrency,
        gas: claimGas,
        gasPrice: await getLegacyGasPrice(publicClient!, feeOption.feeCurrency),
      };

      await runWithDevCapture(
        "claimDailyCheckIn.sign",
        claimTxRequest,
        async () =>
          writeContractAsync({
            ...claimTxRequest,
          } as any)
      );

      logClaimFlow("sendClaim.wallet.submitted", {
        requestId,
        txHash,
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
      inFlight.current = false;
    }
  };

  return {
    sendClaim,
    txHash,
    claimError,
    isPending,
    isConfirming,
    isSuccess,
    isCorrectChain,
    isSwitchingChain: isSwitching,
  };
}
