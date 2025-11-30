import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import { Payment } from "../../../../lib/models/payment.model";
import { PaymentType } from "../../../../lib/types/payment";
import { PAYMENT_RECIPIENT, CUSD_ADDRESSES } from "../../../../lib/config/wagmi";
import dbConnect from "../../../../lib/db";

// Create client for Celo mainnet only
const celoClient = createPublicClient({
  chain: celo,
  transport: http(),
});

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { transactionHash, walletAddress, paymentType, chainId } = await request.json();

    // Log the incoming request for debugging
    console.log("Payment verification request:", {
      transactionHash,
      walletAddress,
      paymentType,
      chainId,
    });

    // Validate inputs
    if (!transactionHash || !walletAddress || !paymentType || !chainId) {
      console.error("Missing required fields:", {
        transactionHash: !!transactionHash,
        walletAddress: !!walletAddress,
        paymentType: !!paymentType,
        chainId: !!chainId,
      });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate chain ID (only Celo mainnet supported)
    if (chainId !== celo.id) {
      console.error("Unsupported chain ID:", chainId, "Expected:", celo.id);
      return NextResponse.json(
        { error: `Unsupported chain. Only Celo mainnet (${celo.id}) is supported` },
        { status: 400 }
      );
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ transactionHash });
    if (existingPayment) {
      console.log("Payment already processed:", transactionHash);
      return NextResponse.json({
        verified: existingPayment.verified,
        message: "Payment already processed",
      });
    }

    // Get transaction receipt
    console.log("Fetching transaction receipt for:", transactionHash);
    const receipt = await celoClient.getTransactionReceipt({
      hash: transactionHash as `0x${string}`,
    });

    if (!receipt) {
      console.error("Transaction receipt not found:", transactionHash);
      return NextResponse.json({ error: "Transaction not found" }, { status: 400 });
    }

    if (receipt.status !== "success") {
      console.error("Transaction failed:", transactionHash, "Status:", receipt.status);
      return NextResponse.json({ error: "Transaction failed" }, { status: 400 });
    }

    console.log("Transaction receipt found, status: success");

    // Get transaction details
    const transaction = await celoClient.getTransaction({
      hash: transactionHash as `0x${string}`,
    });

    // Verify transaction details
    const cusdAddress = CUSD_ADDRESSES[celo.id];
    if (!cusdAddress) {
      console.error("cUSD address not found for Celo mainnet");
      return NextResponse.json({ error: "cUSD not supported on this chain" }, { status: 400 });
    }

    console.log("Using cUSD address:", cusdAddress);

    // Expected amounts for cUSD (18 decimals)
    const expectedAmount =
      paymentType === PaymentType.DAILY_ACCESS
        ? "100000000000000000" // 0.1 cUSD
        : "1000000000000000000"; // 1.0 cUSD

    // For ERC20 transfers, we need to check the logs
    console.log("Looking for transfer logs in transaction, total logs:", receipt.logs.length);
    const transferLog = receipt.logs.find(
      (log) => log.address.toLowerCase() === cusdAddress.toLowerCase()
    );

    if (!transferLog) {
      console.error(
        "cUSD transfer not found. Available log addresses:",
        receipt.logs.map((log) => log.address)
      );
      console.error("Expected cUSD address:", cusdAddress);
      return NextResponse.json(
        { error: "cUSD transfer not found in transaction" },
        { status: 400 }
      );
    }

    console.log("Transfer log found:", transferLog);

    // Decode transfer log (simplified - in production use proper ABI decoding)
    // Transfer event: Transfer(address indexed from, address indexed to, uint256 value)
    const fromAddress = `0x${transferLog.topics[1]?.slice(-40)}`;
    const toAddress = `0x${transferLog.topics[2]?.slice(-40)}`;
    const amount = BigInt(transferLog.data).toString();

    console.log("Decoded transfer:", { fromAddress, toAddress, amount, expectedAmount });
    console.log("Verification params:", {
      walletAddress: walletAddress.toLowerCase(),
      paymentRecipient: PAYMENT_RECIPIENT.toLowerCase(),
    });

    // Verify the transfer details
    if (
      fromAddress.toLowerCase() !== walletAddress.toLowerCase() ||
      toAddress.toLowerCase() !== PAYMENT_RECIPIENT.toLowerCase() ||
      amount !== expectedAmount
    ) {
      console.error("Transaction verification failed:", {
        fromMatch: fromAddress.toLowerCase() === walletAddress.toLowerCase(),
        toMatch: toAddress.toLowerCase() === PAYMENT_RECIPIENT.toLowerCase(),
        amountMatch: amount === expectedAmount,
        fromAddress: fromAddress.toLowerCase(),
        expectedFrom: walletAddress.toLowerCase(),
        toAddress: toAddress.toLowerCase(),
        expectedTo: PAYMENT_RECIPIENT.toLowerCase(),
        amount,
        expectedAmount,
      });
      return NextResponse.json(
        { error: "Transaction details do not match payment requirements" },
        { status: 400 }
      );
    }

    console.log("Transaction verification successful!");

    // Calculate expiry for premium payments
    const expiresAt =
      paymentType === PaymentType.PREMIUM
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        : paymentType === PaymentType.DAILY_ACCESS
        ? new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        : undefined;

    // Save payment to database
    const payment = new Payment({
      walletAddress: walletAddress.toLowerCase(),
      paymentType,
      transactionHash,
      amount,
      chainId,
      recipient: PAYMENT_RECIPIENT.toLowerCase(),
      verified: true,
      expiresAt,
    });

    await payment.save();
    console.log("Payment saved successfully:", payment._id);

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
