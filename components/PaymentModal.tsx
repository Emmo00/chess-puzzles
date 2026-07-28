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
  Wallet,
  Fuel,
} from "lucide-react";
import { usePayment, PaymentQuote } from "../lib/hooks/usePayment";
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
  defaultPriceUsd?: string;
}

export function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  storeItem,
  defaultPriceUsd,
}: PaymentModalProps) {
  const { address } = useAccount();
  const {
    makePayment,
    verifyPayment,
    quotePayment,
    isPaymentPending,
    isConfirming,
    isSuccess,
    transactionHash,
    amountUsd,
  } = usePayment();
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);

  useEffect(() => {
    if (isOpen && address) {
      loadQuote();
    }
  }, [isOpen, address]);

  useEffect(() => {
    if (isSuccess && transactionHash && !isVerifying) {
      handleVerifyPayment();
    }
  }, [isSuccess, transactionHash]);

  const loadQuote = async () => {
    const usd = storeItem ? storeItem.priceUsd : (defaultPriceUsd || "0.01");
    setIsLoadingQuote(true);
    setError(null);
    try {
      const q = await quotePayment(usd);
      setQuote(q);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingQuote(false);
    }
  };

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
      const usd = storeItem ? storeItem.priceUsd : (defaultPriceUsd || "0.01");
      const meta = storeItem
        ? {
            itemId: storeItem._id,
            itemCategory: storeItem.category,
            itemName: storeItem.name,
            itemQuantity: storeItem.quantity,
          }
        : undefined;
      await makePayment(type, usd, meta, quote?.selectedToken.tokenAddress);
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
          setQuote(null);
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
    setQuote(null);
  };

  const isStore = Boolean(storeItem);
  const displayAmount = storeItem
    ? `$${storeItem.priceUsd}`
    : `$${defaultPriceUsd || "0.01"}`;
  const title = isStore
    ? storeItem!.name
    : "Daily Pass";
  const subtitle = isStore
    ? `×${storeItem!.quantity} · ${storeItem!.description || storeItem!.category.replace(/_/g, " ")}`
    : "Unlimited puzzles today";

  if (!isOpen) return null;

  const renderQuote = () => {
    if (isLoadingQuote) {
      return (
        <div className="bg-gray-100 border-4 border-black p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="font-black text-sm text-black uppercase">Checking balances...</p>
        </div>
      );
    }

    if (!quote) {
      return (
        <div className="bg-red-400 border-4 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform -rotate-1 text-left">
          <div className="font-black text-black text-sm uppercase tracking-wide flex items-center gap-2 mb-2">
            <OctagonAlert className="w-4 h-4 shrink-0" /> Unable to load payment info
          </div>
          <button
            onClick={loadQuote}
            className="bg-black text-white px-3 py-1 text-xs font-black uppercase mt-2"
          >
            Retry
          </button>
        </div>
      );
    }

    if (!quote.sufficient) {
      return (
        <div className="space-y-4">
          <div className="bg-red-400 border-4 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform -rotate-1 text-left">
            <div className="font-black text-black text-sm uppercase tracking-wide flex items-center gap-2 mb-2">
              <OctagonAlert className="w-4 h-4 shrink-0" /> Insufficient balance
            </div>
            <div className="text-black font-bold text-xs space-y-1">
              <p>Price: {quote.itemPrice} {quote.selectedToken.symbol}</p>
              <p>Network fee: {quote.estimatedGasFee} {quote.selectedToken.symbol}</p>
              <p>Total required: {quote.totalRequired} {quote.selectedToken.symbol}</p>
              <p>Your balance: {quote.balance} {quote.selectedToken.symbol}</p>
            </div>
          </div>
          <a
            href="https://minipay.to"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-black text-cyan-300 py-3 px-4 font-black text-sm uppercase tracking-wider border-2 border-cyan-300 hover:bg-gray-800 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] inline-flex items-center justify-center gap-2"
          >
            <Wallet className="w-4 h-4" /> TOP UP WALLET
          </a>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="bg-lime-200 border-4 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] text-left text-xs font-bold text-black space-y-2">
          <div className="flex justify-between items-center">
            <span className="uppercase tracking-wide">Token</span>
            <span className="font-black">{quote.selectedToken.symbol}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="uppercase tracking-wide">Price</span>
            <span>{quote.itemPrice} {quote.selectedToken.symbol}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="uppercase tracking-wide flex items-center gap-1">
              <Fuel className="w-3 h-3" /> Network fee
            </span>
            <span>{quote.estimatedGasFee} {quote.selectedToken.symbol}</span>
          </div>
          <div className="border-t-2 border-black pt-2 flex justify-between items-center font-black">
            <span>Total</span>
            <span>{quote.totalRequired} {quote.selectedToken.symbol}</span>
          </div>
          <div className="flex justify-between items-center text-[10px]">
            <span>Balance</span>
            <span>{quote.balance} {quote.selectedToken.symbol}</span>
          </div>
        </div>

        <button
          onClick={handlePayment}
          className="w-full bg-black text-cyan-300 py-3 px-4 font-black text-sm uppercase tracking-wider border-2 border-cyan-300 hover:bg-gray-800 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:transform hover:-translate-x-1 hover:-translate-y-1 flex items-center justify-center gap-2"
        >
          <Smartphone className="w-4 h-4" /> PAY {displayAmount} WITH {quote.selectedToken.symbol}
        </button>
      </div>
    );
  };

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
                    {displayAmount}
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
              </div>

              {renderQuote()}

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
                  <Coins className="w-4 h-4" /> Paying {displayAmount}
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
