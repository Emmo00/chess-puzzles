import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseUnits } from "viem";
import { celo } from "viem/chains";
import { Payment } from "../../../../lib/models/payment.model";
import { PaymentType } from "../../../../lib/types/payment";
import { PAYMENT_RECIPIENT, CUSD_ADDRESSES } from "../../../../lib/config/wagmi";
import HintsService from "../../../../lib/services/hints.service";
import dbConnect from "../../../../lib/db";
import { getAccessConfig } from "../../../../lib/config/access";

const celoClient = createPublicClient({
  chain: celo,
  transport: http(),
});

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { transactionHash, walletAddress, paymentType, chainId, amountUsd, metadata } =
      await request.json();

    console.log("Payment verification request:", {
      transactionHash,
      walletAddress,
      paymentType,
      chainId,
      amountUsd,
      metadata,
    });

    if (!transactionHash || !walletAddress || !paymentType || !chainId) {
      console.error("Missing required fields");
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (chainId !== celo.id) {
      return NextResponse.json(
        { error: `Unsupported chain. Only Celo mainnet (${celo.id}) is supported` },
        { status: 400 }
      );
    }

    const existingPayment = await Payment.findOne({ transactionHash });
    if (existingPayment) {
      console.log("Payment already processed:", transactionHash);
      return NextResponse.json({
        verified: existingPayment.verified,
        message: "Payment already processed",
      });
    }

    let receipt;
    let retries = 0;
    const maxRetries = 10;
    const retryDelay = 2000;

    while (retries < maxRetries) {
      try {
        receipt = await celoClient.getTransactionReceipt({
          hash: transactionHash as `0x${string}`,
        });
        if (receipt) {
          console.log("Transaction receipt found after", retries, "retries");
          break;
        }
      } catch (error: any) {
        if (error.name === "TransactionReceiptNotFoundError") {
          console.log(`Transaction receipt not found, retry ${retries + 1}/${maxRetries}`);
          retries++;
          if (retries < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            continue;
          }
          return NextResponse.json(
            { error: "Transaction is still being processed. Please try again in a few moments.", retryable: true },
            { status: 202 }
          );
        }
        throw error;
      }
    }

    if (!receipt) {
      return NextResponse.json(
        { error: "Transaction not found after multiple attempts.", retryable: false },
        { status: 400 }
      );
    }

    if (receipt.status !== "success") {
      return NextResponse.json({ error: "Transaction failed" }, { status: 400 });
    }

    const cusdAddress = CUSD_ADDRESSES[celo.id];
    if (!cusdAddress) {
      return NextResponse.json({ error: "cUSD not supported on this chain" }, { status: 400 });
    }

    const transferEventSignature =
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

    const transferLog = receipt.logs.find(
      (log) =>
        log.address.toLowerCase() === cusdAddress.toLowerCase() &&
        log.topics[0] === transferEventSignature &&
        log.topics[2] &&
        `0x${log.topics[2].slice(-40)}`.toLowerCase() === PAYMENT_RECIPIENT.toLowerCase()
    );

    if (!transferLog) {
      return NextResponse.json({ error: "cUSD Transfer event not found in transaction" }, { status: 400 });
    }

    const fromAddress = `0x${transferLog.topics[1]?.slice(-40)}`;
    const toAddress = `0x${transferLog.topics[2]?.slice(-40)}`;
    const amount = BigInt(transferLog.data).toString();

    const { unlockAmountUsd, unlockDurationHours } = await getAccessConfig();

    const usdValue = typeof amountUsd === "string" ? amountUsd : unlockAmountUsd;
    let expectedAmount: string;
    try {
      expectedAmount = parseUnits(usdValue, 18).toString();
    } catch {
      expectedAmount = parseUnits(unlockAmountUsd, 18).toString();
    }

    if (
      fromAddress.toLowerCase() !== walletAddress.toLowerCase() ||
      toAddress.toLowerCase() !== PAYMENT_RECIPIENT.toLowerCase() ||
      amount !== expectedAmount
    ) {
      console.error("Transaction verification failed:", {
        fromMatch: fromAddress.toLowerCase() === walletAddress.toLowerCase(),
        toMatch: toAddress.toLowerCase() === PAYMENT_RECIPIENT.toLowerCase(),
        amountMatch: amount === expectedAmount,
        amount,
        expectedAmount,
      });
      return NextResponse.json(
        { error: "Transaction details do not match payment requirements" },
        { status: 400 }
      );
    }

    console.log("Transaction verification successful!");

    const expiresAt =
      paymentType === PaymentType.DAILY_ACCESS
        ? new Date(Date.now() + unlockDurationHours * 60 * 60 * 1000)
        : undefined;

    const paymentRecord = new Payment({
      walletAddress: walletAddress.toLowerCase(),
      paymentType,
      transactionHash,
      amount,
      chainId,
      recipient: PAYMENT_RECIPIENT.toLowerCase(),
      verified: true,
      expiresAt,
      metadata: metadata || undefined,
    });

    await paymentRecord.save();
    console.log("Payment saved:", paymentRecord._id);

    if (
      paymentType === PaymentType.STORE_PURCHASE &&
      metadata &&
      metadata.itemCategory
    ) {
      try {
        const hintsService = new HintsService();
        const itemQuantity = Math.max(1, metadata.itemQuantity || 1);
        if (metadata.itemCategory === "hints") {
          await hintsService.grantHints(walletAddress, itemQuantity);
          console.log(`Granted ${itemQuantity} hints to ${walletAddress}`);
        } else if (metadata.itemCategory === "streak_freeze") {
          await hintsService.grantStreakFreezes(walletAddress, itemQuantity);
          console.log(`Granted ${itemQuantity} streak freezes to ${walletAddress}`);
        }
      } catch (grantError) {
        console.error("Failed to grant store perks:", grantError);
      }
    }

    return NextResponse.json({
      verified: true,
      message: "Payment verified successfully",
      expiresAt: expiresAt?.toISOString(),
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
