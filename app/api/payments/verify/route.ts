import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseUnits } from "viem";
import { celo } from "viem/chains";
import { Payment } from "../../../../lib/models/payment.model";
import { PaymentType } from "../../../../lib/types/payment";
import {
  PAYMENT_RECIPIENT,
  REVENUE_COLLECTOR_CONTRACT,
} from "../../../../lib/config/wagmi";
import { SUPPORTED_STABLES } from "../../../../lib/utils/payment";
import { PREMIUM_PLANS } from "../../../../lib/config/premium";
import dbConnect from "../../../../lib/db";

// Create client for Celo mainnet only
const celoClient = createPublicClient({
  chain: celo,
  transport: http(),
});

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const {
      transactionHash,
      walletAddress,
      paymentType,
      chainId,
      tokenAddress,
    } = await request.json();

    // Log the incoming request for debugging
    console.log("Payment verification request:", {
      transactionHash,
      walletAddress,
      paymentType,
      chainId,
      tokenAddress,
    });

    // Validate inputs
    if (!transactionHash || !walletAddress || !paymentType || !chainId) {
      console.error("Missing required fields:", {
        transactionHash: !!transactionHash,
        walletAddress: !!walletAddress,
        paymentType: !!paymentType,
        chainId: !!chainId,
      });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate chain ID (only Celo mainnet supported)
    if (chainId !== celo.id) {
      console.error("Unsupported chain ID:", chainId, "Expected:", celo.id);
      return NextResponse.json(
        {
          error: `Unsupported chain. Only Celo mainnet (${celo.id}) is supported`,
        },
        { status: 400 },
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

    // Get transaction receipt with retry logic
    console.log("Fetching transaction receipt for:", transactionHash);
    let receipt;
    let retries = 0;
    const maxRetries = 10;
    const retryDelay = 2000; // 2 seconds

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
          console.log(
            `Transaction receipt not found, retry ${retries + 1}/${maxRetries}`,
          );
          retries++;

          if (retries < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            continue;
          }

          // If we've exhausted retries, return a more helpful error
          console.error(
            "Transaction receipt not found after all retries:",
            transactionHash,
          );
          return NextResponse.json(
            {
              error:
                "Transaction is still being processed. Please try again in a few moments.",
              retryable: true,
            },
            { status: 202 }, // 202 Accepted - request received but not yet processed
          );
        } else {
          // Re-throw other errors
          throw error;
        }
      }
    }

    if (!receipt) {
      console.error(
        "Transaction receipt not found after retries:",
        transactionHash,
      );
      return NextResponse.json(
        {
          error:
            "Transaction not found after multiple attempts. Please check the transaction hash.",
          retryable: false,
        },
        { status: 400 },
      );
    }

    if (receipt.status !== "success") {
      console.error(
        "Transaction failed:",
        transactionHash,
        "Status:",
        receipt.status,
      );
      return NextResponse.json(
        { error: "Transaction failed" },
        { status: 400 },
      );
    }

    console.log("Transaction receipt found, status: success");

    // Get transaction details
    const transaction = await celoClient.getTransaction({
      hash: transactionHash as `0x${string}`,
    });

    // Determine expected amount and recipient based on payment type
    let expectedRecipient: string;
    let expiresAt: Date;

    if (paymentType === PaymentType.DAILY_ACCESS) {
      expectedRecipient = PAYMENT_RECIPIENT.toLowerCase();
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else if (paymentType === PaymentType.PREMIUM_MONTHLY) {
      expectedRecipient = (
        REVENUE_COLLECTOR_CONTRACT || PAYMENT_RECIPIENT
      ).toLowerCase();
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else if (paymentType === PaymentType.PREMIUM_YEARLY) {
      expectedRecipient = (
        REVENUE_COLLECTOR_CONTRACT || PAYMENT_RECIPIENT
      ).toLowerCase();
      expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    } else {
      return NextResponse.json(
        { error: "Unknown payment type" },
        { status: 400 },
      );
    }

    // Find supported token by address or use provided tokenAddress
    let tokenToCheck = tokenAddress
      ? SUPPORTED_STABLES.find(
          (t) => t.tokenAddress.toLowerCase() === tokenAddress.toLowerCase(),
        )
      : null;

    // If no token specified, check all supported tokens
    if (!tokenToCheck && tokenAddress) {
      console.error("Token address not in supported list:", tokenAddress);
      return NextResponse.json({ error: "Unsupported token" }, { status: 400 });
    }

    // For ERC20 transfers, we need to check the logs
    // Transfer event signature: keccak256("Transfer(address,address,uint256)") = 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
    const transferEventSignature =
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

    console.log(
      "Looking for transfer logs in transaction, total logs:",
      receipt.logs.length,
    );

    // If token was specified, check only that token
    // Otherwise, check all supported stablecoins
    const tokensToCheck = tokenToCheck ? [tokenToCheck] : SUPPORTED_STABLES;
    let transferLog = null;
    let usedToken = null;

    for (const token of tokensToCheck) {
      const log = receipt.logs.find(
        (log) =>
          log.address.toLowerCase() === token.tokenAddress.toLowerCase() &&
          log.topics[0] === transferEventSignature &&
          log.topics[2] &&
          `0x${log.topics[2].slice(-40)}`.toLowerCase() ===
            expectedRecipient.toLowerCase(),
      );

      if (log) {
        transferLog = log;
        usedToken = token;
        console.log("Found transfer log for token:", token.symbol);
        break;
      }
    }

    if (!transferLog || !usedToken) {
      console.error(
        "Transfer event not found for any supported token. Available logs:",
        receipt.logs
          .filter((log) =>
            SUPPORTED_STABLES.some(
              (t) => t.tokenAddress.toLowerCase() === log.address.toLowerCase(),
            ),
          )
          .map((log, index) => ({
            index,
            address: log.address,
            topics: log.topics,
          })),
      );
      return NextResponse.json(
        { error: "ERC20 Transfer event not found in transaction" },
        { status: 400 },
      );
    }

    console.log("Transfer log found:", transferLog);

    // Decode transfer log
    // Transfer event: Transfer(address indexed from, address indexed to, uint256 value)
    const fromAddress = `0x${transferLog.topics[1]?.slice(-40)}`;
    const toAddress = `0x${transferLog.topics[2]?.slice(-40)}`;
    const amount = BigInt(transferLog.data).toString();

    const plan = PREMIUM_PLANS[paymentType as PaymentType];
    const expectedAmountInTokenUnits = parseUnits(
      plan.priceCusd,
      usedToken.decimals,
    ).toString();

    console.log("Decoded transfer:", {
      fromAddress,
      toAddress,
      amount,
      expectedAmountInTokenUnits,
      tokenSymbol: usedToken.symbol,
    });
    console.log("Verification params:", {
      walletAddress: walletAddress.toLowerCase(),
      expectedRecipient: expectedRecipient.toLowerCase(),
      tokenDecimals: usedToken.decimals,
    });

    // Verify the transfer details
    if (
      fromAddress.toLowerCase() !== walletAddress.toLowerCase() ||
      toAddress.toLowerCase() !== expectedRecipient.toLowerCase() ||
      amount !== expectedAmountInTokenUnits
    ) {
      console.error("Transaction verification failed:", {
        fromMatch: fromAddress.toLowerCase() === walletAddress.toLowerCase(),
        toMatch: toAddress.toLowerCase() === expectedRecipient.toLowerCase(),
        amountMatch: amount === expectedAmountInTokenUnits,
        fromAddress: fromAddress.toLowerCase(),
        expectedFrom: walletAddress.toLowerCase(),
        toAddress: toAddress.toLowerCase(),
        expectedTo: expectedRecipient.toLowerCase(),
        amount,
        expectedAmountInTokenUnits,
      });
      return NextResponse.json(
        { error: "Transaction details do not match payment requirements" },
        { status: 400 },
      );
    }

    console.log("Transaction verification successful!");

    // Save payment to database
    const payment = new Payment({
      walletAddress: walletAddress.toLowerCase(),
      paymentType,
      transactionHash,
      amount,
      chainId,
      recipient: expectedRecipient.toLowerCase(),
      tokenAddress: usedToken.tokenAddress,
      tokenSymbol: usedToken.symbol,
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
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 },
    );
  }
}
