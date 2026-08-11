"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
import { erc20Abi, type Hex, parseUnits } from "viem";
import { celo } from "wagmi/chains";
import { isOnCorrectChain, isMiniPay } from "@/lib/config/wagmi";
import { getLegacyGasPrice } from "@/lib/utils/minipayTx";
import {
  BadgeCheck,
  Castle,
  Coins,
  CreditCard,
  Lightbulb,
  OctagonAlert,
  PartyPopper,
  RefreshCw,
  Search,
  Smartphone,
  Store,
  X,
  Zap,
  Wallet,
  Fuel,
  Lock,
  Pointer,
} from "lucide-react";
import { ALLOWLISTED_STABLECOINS, GAME_ASSETS_CONTRACT, GAME_ASSET_TYPES } from "@/lib/config/wagmi";
import { GAME_ASSETS_ABI } from "@/lib/abi/gameAssets";
import { runWithDevCapture } from "@/lib/utils/devStore";
import { useAssetBalances, type AssetType } from "@/lib/hooks/assetBalances";
import { TelegramSupportLink } from "./TelegramSupportLink";

interface StoreItem {
  _id?: string;
  name: string;
  category: string;
  description?: string;
  priceUsd: string;
  quantity: number;
  packId?: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  storeItem?: StoreItem | null;
  defaultPriceUsd?: string;
}

type Step = "quote" | "approving" | "purchasing" | "done" | "error";

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export function PaymentModal({ isOpen, onClose, onSuccess, storeItem, defaultPriceUsd }: PaymentModalProps) {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { optimisticAdd, confirmPurchase, rollbackPurchase } = useAssetBalances();
  const optimisticRef = useRef<{ id: string; type: AssetType; qty: number } | null>(null);
  const [step, setStep] = useState<Step>("quote");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hex | undefined>();
  const [selectedToken, setSelectedToken] = useState<(typeof ALLOWLISTED_STABLECOINS)[number] | null>(null);
  const [balance, setBalance] = useState<bigint>(0n);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [userMessage, setUserMessage] = useState("");

  const {
    isLoading: isConfirming,
    isSuccess: txConfirmed,
    isError: txFailed,
  } = useWaitForTransactionReceipt({ hash: txHash, timeout: 60_000 });

  const ensureCorrectChain = async (): Promise<boolean> => {
    // MiniPay is always on Celo mainnet; during SSR/hydration chainId is
    // undefined. Both should short-circuit instead of requesting a switch.
    if (chainId === undefined || isMiniPay()) return true;
    if (isOnCorrectChain(chainId)) return true;

    if (!address) {
      throw new Error("Wallet not connected");
    }

    try {
      await switchChain({ chainId: celo.id });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to switch to Celo Mainnet";
      setError(message);
      throw new Error(message);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStep("quote");
      setError(null);
      setTxHash(undefined);
      setNeedsApproval(false);
      setUserMessage("");
      optimisticRef.current = null;
      if (address) loadQuote();
    }
  }, [isOpen, address]);

  useEffect(() => {
    if (txConfirmed && step === "purchasing") {
      setStep("done");
      setUserMessage("");
      const optimistic = optimisticRef.current;
      if (optimistic) {
        optimisticRef.current = null;
        void confirmPurchase(optimistic.id);
      }
    }
  }, [txConfirmed, step, confirmPurchase]);

  useEffect(() => {
    if (txConfirmed && step === "approving") {
      doPurchase();
    }
  }, [txConfirmed, step]);

  useEffect(() => {
    if (txFailed && (step === "approving" || step === "purchasing")) {
      const optimistic = optimisticRef.current;
      if (optimistic) {
        optimisticRef.current = null;
        void rollbackPurchase(optimistic.id);
      }
      setError("Transaction timed out or failed on-chain. Please try again.");
      setStep("quote");
      setUserMessage("");
      setTxHash(undefined);
    }
  }, [txFailed, step, rollbackPurchase]);

  const usdAmount = storeItem ? storeItem.priceUsd : defaultPriceUsd || "0.01";
  const displayAmount = `$${usdAmount}`;
  const title = storeItem ? storeItem.name : "Daily Pass";
  const subtitle = storeItem
    ? `×${storeItem.quantity} · ${storeItem.description || storeItem.category.replace(/_/g, " ")}`
    : "Unlimited puzzles today";
  const isStore = Boolean(storeItem);

  const loadQuote = async () => {
    if (!address || !publicClient || !chainId) return;
    setUserMessage("Checking balances...");
    try {
      const sorted = [...ALLOWLISTED_STABLECOINS].map((c) => ({ ...c }));
      const results = await Promise.allSettled(
        sorted.map((c) =>
          publicClient.readContract({
            address: c.tokenAddress as Hex,
            abi: ERC20_BALANCE_ABI,
            functionName: "balanceOf",
            args: [address as Hex],
          }),
        ),
      );
      let best = sorted[0];
      let bestRawBal = 0n;
      let bestNormed = 0n;
      for (let i = 0; i < sorted.length; i++) {
        if (results[i].status === "fulfilled") {
          const bal = (results[i] as PromiseFulfilledResult<bigint>).value;
          const normed = sorted[i].decimals === 18 ? bal : bal * 10n ** BigInt(18 - sorted[i].decimals);
          if (normed > bestNormed) {
            bestNormed = normed;
            bestRawBal = bal;
            best = sorted[i];
          }
        }
      }
      setBalance(bestRawBal);
      setSelectedToken(best);

      if (GAME_ASSETS_CONTRACT) {
        const amount = parseUnits(usdAmount, best.decimals);
        if (bestRawBal < amount) {
          setError(
            `Insufficient ${best.symbol} balance. Price: ${usdAmount} ${best.symbol}, balance: ${formatBalance(bestRawBal, best.decimals)}`,
          );
          setUserMessage("");
          return;
        }
        const allowance = await publicClient.readContract({
          address: best.tokenAddress as Hex,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address as Hex, GAME_ASSETS_CONTRACT],
        });
        setNeedsApproval(allowance < amount);
      }
      setUserMessage("");
    } catch (err: any) {
      setError(err.message || "Failed to load quote");
      setUserMessage("");
    }
  };

  const doApproval = async () => {
    if (!address || !selectedToken || !publicClient || !GAME_ASSETS_CONTRACT) return;
    setStep("approving");
    const amount = parseUnits(usdAmount, selectedToken.decimals);
    setUserMessage("Confirm with your wallet to authorize the store");
    try {
      // MiniPay requires explicit gas when feeCurrency is set
      let approveGas: bigint | undefined;
      try {
        const g = await publicClient.estimateContractGas({
          account: address,
          address: selectedToken.tokenAddress as Hex,
          abi: erc20Abi,
          functionName: "approve",
          args: [GAME_ASSETS_CONTRACT, amount],
          ...{ feeCurrency: selectedToken.feeCurrencyAddress as Hex },
        });
        approveGas = (g * 12n) / 10n;
      } catch {
        try {
          const g = await publicClient.estimateContractGas({
            account: address,
            address: selectedToken.tokenAddress as Hex,
            abi: erc20Abi,
            functionName: "approve",
            args: [GAME_ASSETS_CONTRACT, amount],
          });
          approveGas = (g * 12n) / 10n + 60_000n;
        } catch {
          approveGas = 150_000n;
        }
      }

      const approveRequest: Parameters<typeof writeContractAsync>[0] = {
        address: selectedToken.tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [GAME_ASSETS_CONTRACT, amount],
        feeCurrency: selectedToken.feeCurrencyAddress as Hex,
        gas: approveGas,
        gasPrice: await getLegacyGasPrice(publicClient, selectedToken.feeCurrencyAddress as Hex),
      };
      const hash = await runWithDevCapture("payment.approve", approveRequest, () => writeContractAsync(approveRequest));
      setTxHash(hash);
    } catch (err: any) {
      setError(err?.shortMessage || err?.message || "Approval cancelled");
      setStep("quote");
      setUserMessage("");
    }
  };

  const doPurchase = async () => {
    if (!address || !selectedToken || !publicClient || !GAME_ASSETS_CONTRACT) return;
    setStep("purchasing");
    setTxHash(undefined);
    setUserMessage("Confirm with your wallet to complete the purchase");
    try {
      const feeCurrency = selectedToken.feeCurrencyAddress as Hex;

      if (!storeItem) {
        // Daily pass
        let buyGas: bigint;
        try {
          const g = await publicClient.estimateContractGas({
            account: address,
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: "purchaseDailyPass",
            args: [selectedToken.tokenAddress as Hex],
            ...{ feeCurrency },
          });
          buyGas = (g * 12n) / 10n;
        } catch {
          try {
            const g = await publicClient.estimateContractGas({
              account: address,
              address: GAME_ASSETS_CONTRACT,
              abi: GAME_ASSETS_ABI,
              functionName: "purchaseDailyPass",
              args: [selectedToken.tokenAddress as Hex],
            });
            buyGas = (g * 12n) / 10n + 100_000n;
          } catch {
            buyGas = 300_000n;
          }
        }
        const purchaseRequest: Parameters<typeof writeContractAsync>[0] = {
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "purchaseDailyPass",
          args: [selectedToken.tokenAddress as Hex],
          feeCurrency,
          gas: buyGas,
          gasPrice: await getLegacyGasPrice(publicClient, feeCurrency),
        };
        const hash = await runWithDevCapture("payment.purchaseDailyPass", purchaseRequest, () =>
          writeContractAsync(purchaseRequest),
        );
        setTxHash(hash);
      } else if (storeItem?.packId !== undefined) {
        let buyGas: bigint;
        try {
          const g = await publicClient.estimateContractGas({
            account: address,
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: "purchaseAssetPack",
            args: [BigInt(storeItem.packId), selectedToken.tokenAddress as Hex],
            ...{ feeCurrency },
          });
          buyGas = (g * 12n) / 10n;
        } catch {
          try {
            const g = await publicClient.estimateContractGas({
              account: address,
              address: GAME_ASSETS_CONTRACT,
              abi: GAME_ASSETS_ABI,
              functionName: "purchaseAssetPack",
              args: [BigInt(storeItem.packId), selectedToken.tokenAddress as Hex],
            });
            buyGas = (g * 12n) / 10n + 100_000n;
          } catch {
            buyGas = 300_000n;
          }
        }
        const packRequest: Parameters<typeof writeContractAsync>[0] = {
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "purchaseAssetPack",
          args: [BigInt(storeItem.packId), selectedToken.tokenAddress as Hex],
          feeCurrency,
          gas: buyGas,
          gasPrice: await getLegacyGasPrice(publicClient, feeCurrency),
        };
        const hash = await runWithDevCapture("payment.purchaseAssetPack", packRequest, () =>
          writeContractAsync(packRequest),
        );
        setTxHash(hash);
        const packType: AssetType = storeItem?.category === "streak_freeze" ? "streakFreezes" : "hints";
        const packQty = Number(storeItem?.quantity || 0);
        if (packQty > 0) {
          optimisticRef.current = { id: hash, type: packType, qty: packQty };
          optimisticAdd(hash, packType, packQty);
        }
      } else {
        const assetType =
          storeItem?.category === "streak_freeze" ? GAME_ASSET_TYPES.STREAK_FREEZE : GAME_ASSET_TYPES.HINT;
        const quantity = storeItem?.quantity || 1;
        let buyGas: bigint;
        try {
          const g = await publicClient.estimateContractGas({
            account: address,
            address: GAME_ASSETS_CONTRACT,
            abi: GAME_ASSETS_ABI,
            functionName: "purchaseAsset",
            args: [assetType, BigInt(quantity), selectedToken.tokenAddress as Hex],
            ...{ feeCurrency },
          });
          buyGas = (g * 12n) / 10n;
        } catch {
          try {
            const g = await publicClient.estimateContractGas({
              account: address,
              address: GAME_ASSETS_CONTRACT,
              abi: GAME_ASSETS_ABI,
              functionName: "purchaseAsset",
              args: [assetType, BigInt(quantity), selectedToken.tokenAddress as Hex],
            });
            buyGas = (g * 12n) / 10n + 100_000n;
          } catch {
            buyGas = 300_000n;
          }
        }
        const assetRequest: Parameters<typeof writeContractAsync>[0] = {
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "purchaseAsset",
          args: [assetType, BigInt(quantity), selectedToken.tokenAddress as Hex],
          feeCurrency,
          gas: buyGas,
          gasPrice: await getLegacyGasPrice(publicClient, feeCurrency),
        };
        const hash = await runWithDevCapture("payment.purchaseAsset", assetRequest, () =>
          writeContractAsync(assetRequest),
        );
        setTxHash(hash);
        const unitType: AssetType = storeItem?.category === "streak_freeze" ? "streakFreezes" : "hints";
        if (quantity > 0) {
          optimisticRef.current = { id: hash, type: unitType, qty: quantity };
          optimisticAdd(hash, unitType, quantity);
        }
      }
    } catch (err: any) {
      const optimistic = optimisticRef.current;
      if (optimistic) {
        optimisticRef.current = null;
        void rollbackPurchase(optimistic.id);
      }
      setError(err?.shortMessage || err?.message || "Purchase failed");
      setStep("quote");
      setUserMessage("");
    }
  };

  const handlePay = async () => {
    setError(null);
    if (!GAME_ASSETS_CONTRACT) {
      setError("Store contract not deployed yet. Please try again later.");
      return;
    }
    // Ensure user is on Celo Mainnet before proceeding
    try {
      await ensureCorrectChain();
    } catch {
      return;
    }

    if (needsApproval) {
      await doApproval();
    } else {
      await doPurchase();
    }
  };

  const handleClose = () => {
    if (step === "approving" || step === "purchasing") return;
    onClose();
  };

  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  const formatBalance = (b: bigint, d: number) => {
    const s = b.toString();
    if (s.length <= d) return `0.${s.padStart(d, "0")}`;
    return `${s.slice(0, s.length - d)}.${s.slice(-d)}`;
  };

  if (!isOpen) return null;

  const renderQuote = () => {
    if (userMessage && step === "quote") {
      return (
        <div className="bg-gray-100 border-4 border-black p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="font-black text-sm text-black uppercase">{userMessage}</p>
        </div>
      );
    }

    if (!selectedToken) {
      return (
        <div className="bg-red-400 border-4 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform -rotate-1 text-left">
          <div className="font-black text-black text-sm uppercase tracking-wide flex items-center gap-2 mb-2">
            <OctagonAlert className="w-4 h-4 shrink-0" /> Unable to load payment info
          </div>
          <button onClick={loadQuote} className="bg-black text-white px-3 py-1 text-xs font-black uppercase mt-2">
            Retry
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="bg-lime-200 border-4 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] text-left text-xs font-bold text-black space-y-2">
          <div className="flex justify-between items-center">
            <span className="uppercase tracking-wide">Pay with</span>
            <span className="font-black">{selectedToken.symbol}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="uppercase tracking-wide">Price</span>
            <span>
              {usdAmount} {selectedToken.symbol}
            </span>
          </div>
          <div className="flex justify-between items-center text-[10px]">
            <span>Balance</span>
            <span>
              {formatBalance(balance, selectedToken.decimals)} {selectedToken.symbol}
            </span>
          </div>
        </div>

        <button
          onClick={handlePay}
          className="w-full bg-black text-cyan-300 py-3 px-4 font-black text-sm uppercase tracking-wider border-2 border-cyan-300 hover:bg-gray-800 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2"
        >
          <Smartphone className="w-4 h-4" /> PAY {displayAmount} WITH {selectedToken.symbol}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 p-4 flex items-center justify-center pointer-events-auto">
      <div className="absolute inset-0 bg-black/80" onClick={handleClose} />

      <div className="relative bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] max-w-md w-full transform rotate-1">
        <div className={`${isStore ? "bg-lime-400" : "bg-orange-400"} border-b-4 border-black p-4`}>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase tracking-wider text-black flex items-center gap-2">
              {isStore ? (
                <>
                  <Store className="w-7 h-7" /> STORE
                </>
              ) : (
                <>
                  <Castle className="w-7 h-7" /> ACCESS PUZZLES
                </>
              )}
            </h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 bg-red-500 border-2 border-black text-black hover:bg-red-400 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={step === "approving" || step === "purchasing"}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 bg-white">
          {error && step !== "approving" && step !== "purchasing" && (
            <div className="bg-red-400 border-4 border-black p-4 mb-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform -rotate-1 text-left">
              <div className="font-black text-black text-sm uppercase tracking-wide flex items-center gap-2 mb-2">
                <OctagonAlert className="w-4 h-4 shrink-0" /> {error}
              </div>
              <TelegramSupportLink />
            </div>
          )}

          {step === "quote" && (
            <div className="space-y-4">
              <div
                className={`${isStore ? "bg-lime-200" : "bg-cyan-300"} border-4 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform rotate-1`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-black text-lg uppercase text-black flex items-center gap-2">
                    {isStore ? <Store className="w-5 h-5" /> : <Lightbulb className="w-5 h-5" />}
                    {title}
                  </h3>
                  <span className="bg-black text-cyan-300 px-3 py-1 font-black text-xl border-2 border-cyan-300">
                    {displayAmount}
                  </span>
                </div>
                <p className="text-black font-bold text-sm uppercase tracking-wide flex items-center gap-1">
                  {isStore ? (
                    <>
                      <Lightbulb className="w-4 h-4" /> {subtitle}
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" /> {subtitle}
                    </>
                  )}
                </p>
              </div>

              {renderQuote()}
            </div>
          )}

          {step === "approving" && (
            <div className="text-center py-8">
              <div className="bg-purple-400 border-4 border-black p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform -rotate-2">
                <div className="w-16 h-16 mx-auto mb-4 bg-black border-4 border-purple-400 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-purple-400 animate-pulse" />
                </div>
                <h3 className="font-black text-xl uppercase mb-2 text-black tracking-wider">Authorize Payment</h3>
                <p className="font-bold text-black text-sm uppercase tracking-wide mb-2">
                  {isConfirming ? "Processing authorization..." : userMessage || "Confirm with your wallet"}
                </p>
                <p className="text-xs font-bold text-black/70">
                  This one-time authorization allows the store to charge your wallet.
                </p>
              </div>
            </div>
          )}

          {step === "purchasing" && (
            <div className="text-center py-8">
              <div className="bg-blue-400 border-4 border-black p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform rotate-1">
                <div className="w-16 h-16 mx-auto mb-4 bg-black border-4 border-blue-400 animate-bounce flex items-center justify-center">
                  <Coins className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="font-black text-xl uppercase mb-2 text-black tracking-wider">
                  {isConfirming ? "Confirming..." : "Processing Purchase"}
                </h3>
                <p className="font-bold text-black text-sm uppercase tracking-wide mb-2">
                  {isConfirming ? "Waiting for confirmation..." : userMessage || "Confirm with your wallet"}
                </p>
                <p className="text-xs font-bold text-black/70">
                  {needsApproval ? "Step 2 of 2: completing the purchase" : "Completing your purchase"}
                </p>
                {txHash && (
                  <div className="bg-black text-blue-400 p-2 mt-4 border-2 border-blue-400 text-xs font-mono break-all">
                    TX: {txHash.slice(0, 20)}...
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-8">
              <div className="bg-green-400 border-4 border-black p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] transform rotate-2">
                <div className="mb-4 flex justify-center">
                  <PartyPopper className="w-14 h-14 text-black animate-bounce" />
                </div>
                <h3 className="font-black text-2xl uppercase mb-2 text-black tracking-wider">Success!</h3>
                <p className="font-bold text-black uppercase tracking-wide flex items-center justify-center gap-2">
                  <BadgeCheck className="w-5 h-5" /> {isStore ? "Purchased!" : "Access Granted!"}
                </p>
                <button
                  onClick={handleSuccess}
                  className="mt-6 bg-black text-green-400 px-6 py-2 font-black text-sm uppercase border-2 border-green-400 hover:bg-gray-800 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
