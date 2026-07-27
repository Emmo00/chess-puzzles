"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
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
  Target,
  X,
  Zap,
} from "lucide-react";
import { usePayment } from "../lib/hooks/usePayment";
import { PaymentType } from "../lib/types/payment";
import { TelegramSupportLink } from "./TelegramSupportLink";

interface StoreItem {
  _id?: string;
  name: string;
  category: string;
  description?: string;
  priceUsd: string;
  quantity: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  storeItem?: StoreItem | null;
}

export function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  storeItem,
}: PaymentModalProps) {
  const { address } = useAccount();
  const {
    makePayment,
    verifyPayment,
    isPaymentPending,
    isConfirming,
    isSuccess,
    transactionHash,
    amountUsd,
  } = usePayment();
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isSuccess && transactionHash && !isVerifying) {
      handleVerifyPayment();
    }
  }, [isSuccess, transactionHash]);

  const handlePayment = async () => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setError(null);
      const type = storeItem
        ? PaymentType.STORE_PURCHASE
        : PaymentType.DAILY_ACCESS;
      const usd = storeItem ? storeItem.priceUsd : "0.01";
      const meta = storeItem
        ? {
            itemId: storeItem._id,
            itemCategory: storeItem.category,
            itemName: storeItem.name,
            itemQuantity: storeItem.quantity,
          }
        : undefined;
      await makePayment(type, usd, meta);
    } catch (err: any) {
      console.error("Payment error:", err);
      setError(err instanceof Error ? err.message : "Payment failed");
    }
  };

  const handleVerifyPayment = async () => {
    if (isVerifying) return;

    try {
      setIsVerifying(true);
      setError(null);
      const verified = await verifyPayment();
      if (verified) {
        onSuccess();
        setTimeout(() => {
          onClose();
          setError(null);
          setIsVerifying(false);
        }, 1500);
      } else {
        setError("Payment verification failed. Please contact support.");
        setIsVerifying(false);
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to verify payment"
      );
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    if (isPaymentPending || isConfirming || isVerifying) return;
    onClose();
    setError(null);
  };

  const isStore = Boolean(storeItem);
  const displayAmount = storeItem
    ? `$${storeItem.priceUsd}`
    : "$0.01";
  const title = isStore
    ? storeItem!.name
    : "Daily Pass";
  const subtitle = isStore
    ? `×${storeItem!.quantity} · ${storeItem!.description || storeItem!.category.replace(/_/g, " ")}`
    : "Unlimited puzzles today";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 p-4 flex items-center justify-center pointer-events-auto">
      <div
        className="absolute inset-0 bg-black/80"
        onClick={handleClose}
      />

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
              className="w-8 h-8 bg-red-500 border-2 border-black text-black hover:bg-red-400 transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={isPaymentPending || isConfirming || isVerifying}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 bg-white">
          {error && (
            <div className="bg-red-400 border-4 border-black p-4 mb-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform -rotate-1 text-left">
              <div className="font-black text-black text-sm uppercase tracking-wide flex items-center gap-2 mb-2">
                <OctagonAlert className="w-4 h-4 shrink-0" /> {error}
              </div>
              <TelegramSupportLink />
            </div>
          )}

          {!isPaymentPending && !isConfirming && !isSuccess && !isVerifying && (
            <div className="space-y-4">
              <div className={`${isStore ? "bg-lime-200" : "bg-cyan-300"} border-4 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform rotate-1`}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-black text-lg uppercase text-black flex items-center gap-2">
                    {isStore ? <Store className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                    {title}
                  </h3>
                  <span className="bg-black text-cyan-300 px-3 py-1 font-black text-xl border-2 border-cyan-300">
                    {displayAmount} cUSD
                  </span>
                </div>
                <p className="text-black font-bold text-sm mb-2 uppercase tracking-wide flex items-center gap-1">
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
                <button
                  onClick={handlePayment}
                  className="w-full bg-black text-cyan-300 py-3 px-4 font-black text-sm uppercase tracking-wider border-2 border-cyan-300 hover:bg-gray-800 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:transform hover:-translate-x-1 hover:-translate-y-1 flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-4 h-4" /> PAY {displayAmount} cUSD
                </button>
              </div>

              <div className="bg-yellow-200 border-2 border-black p-3 transform rotate-1 mt-4">
                <p className="text-xs font-bold text-black uppercase tracking-wide text-center flex items-center justify-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" /> Powered by MiniPay on Celo Network
                </p>
              </div>
            </div>
          )}

          {(isPaymentPending || isConfirming) && (
            <div className="text-center py-8">
              <div className="bg-purple-400 border-4 border-black p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform -rotate-2">
                <div className="w-16 h-16 mx-auto mb-4 bg-black border-4 border-purple-400 animate-bounce">
                  <div className="w-full h-full bg-purple-400 border-2 border-black animate-pulse"></div>
                </div>
                <h3 className="font-black text-xl uppercase mb-2 text-black tracking-wider">
                  <span className="inline-flex items-center gap-2">
                    {isPaymentPending ? <Zap className="w-5 h-5" /> : <RefreshCw className="w-5 h-5 animate-spin" />}
                    {isPaymentPending ? "Processing..." : "Confirming..."}
                  </span>
                </h3>
                <p className="font-bold text-black text-sm uppercase tracking-wide flex items-center justify-center gap-1">
                  <Coins className="w-4 h-4" /> Paying {displayAmount} cUSD
                </p>
                {transactionHash && (
                  <div className="bg-black text-purple-400 p-2 mt-4 border-2 border-purple-400 text-xs font-mono break-all">
                    TX: {transactionHash.slice(0, 20)}...
                  </div>
                )}
              </div>
            </div>
          )}

          {isVerifying && (
            <div className="text-center py-8">
              <div className="bg-blue-400 border-4 border-black p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] transform rotate-1">
                <div className="w-16 h-16 mx-auto mb-4 bg-black border-4 border-blue-400 animate-pulse">
                  <div className="w-full h-full bg-blue-400 border-2 border-black animate-spin"></div>
                </div>
                <h3 className="font-black text-xl uppercase mb-2 text-black tracking-wider">
                  <span className="inline-flex items-center gap-2">
                    <Search className="w-5 h-5" /> Verifying Payment...
                  </span>
                </h3>
                <p className="font-bold text-black text-sm uppercase tracking-wide">
                  This may take a few moments while we wait for blockchain confirmation
                </p>
                {transactionHash && (
                  <div className="bg-black text-blue-400 p-2 mt-4 border-2 border-blue-400 text-xs font-mono break-all">
                    TX: {transactionHash.slice(0, 20)}...
                  </div>
                )}
              </div>
            </div>
          )}

          {isSuccess && !isVerifying && (
            <div className="text-center py-8">
              <div className="bg-green-400 border-4 border-black p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] transform rotate-2">
                <div className="mb-4 flex justify-center">
                  <PartyPopper className="w-14 h-14 animate-bounce" />
                </div>
                <h3 className="font-black text-2xl uppercase mb-2 text-black tracking-wider">
                  Success!
                </h3>
                <p className="font-bold text-black uppercase tracking-wide flex items-center justify-center gap-2">
                  <BadgeCheck className="w-5 h-5" /> {isStore ? "Purchased!" : "Access Granted!"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
