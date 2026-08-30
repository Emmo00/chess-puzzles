import { Router, Request, Response } from "express";
import { parseUnits } from "viem";
import { celo } from "viem/chains";
import { Payment, PaymentType } from "@workspace/db";
import { PAYMENT_RECIPIENT, SUPPORTED_CURRENCIES } from "../../lib/config/wagmi";
import { dbConnect } from "@workspace/db";
import { getAccessConfig } from "../../lib/config/access";
import { authenticateWallet } from "../../middleware/auth";
import { maskAddress } from "../../middleware/logging";
import { publicClient } from "../../config/publicClient";

const router: Router = Router();

router.post("/", authenticateWallet, async (req: Request, res: Response) => {
  const log = (req as any).log;
  try {
    await dbConnect();
    const { transactionHash, walletAddress, paymentType, chainId, amountUsd, metadata, tokenAddress } =
      req.body;

    log?.debug("payments.verify.body", {
      transactionHash,
      wallet: maskAddress(walletAddress || ""),
      paymentType,
      chainId,
      amountUsd,
      hasMetadata: !!metadata,
      tokenAddress,
    });

    if (!transactionHash || !walletAddress || !paymentType || !chainId) {
      log?.warn("payments.verify.missingFields", {
        hasHash: !!transactionHash,
        hasWallet: !!walletAddress,
        hasType: !!paymentType,
        hasChainId: !!chainId,
      });
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (chainId !== celo.id) {
      log?.warn("payments.verify.unsupportedChain", { chainId });
      res.status(400).json({
        error: `Unsupported chain. Only Celo mainnet (${celo.id}) is supported`,
      });
      return;
    }

    const existingPayment = await Payment.findOne({ transactionHash });
    if (existingPayment) {
      log?.info("payments.verify.alreadyProcessed", {
        wallet: maskAddress(walletAddress),
        transactionHash,
        verified: existingPayment.verified,
      });
      res.json({
        verified: existingPayment.verified,
        message: "Payment already processed",
      });
      return;
    }

    let receipt;
    let retries = 0;
    const maxRetries = 10;
    const retryDelay = 2000;

    while (retries < maxRetries) {
      try {
        receipt = await publicClient.getTransactionReceipt({
          hash: transactionHash as `0x${string}`,
        });
        if (receipt) {
          log?.info("payments.verify.receiptFound", {
            wallet: maskAddress(walletAddress),
            transactionHash,
            retries,
          });
          break;
        }
      } catch (error: any) {
        if (error.name === "TransactionReceiptNotFoundError") {
          log?.debug("payments.verify.receiptRetry", {
            wallet: maskAddress(walletAddress),
            transactionHash,
            attempt: retries + 1,
            maxRetries,
          });
          retries++;
          if (retries < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            continue;
          }
          log?.warn("payments.verify.receiptPending", {
            wallet: maskAddress(walletAddress),
            transactionHash,
          });
          res.status(202).json({
            error: "Transaction is still being processed. Please try again in a few moments.",
            retryable: true,
          });
          return;
        }
        throw error;
      }
    }

    if (!receipt) {
      log?.warn("payments.verify.receiptNotFound", {
        wallet: maskAddress(walletAddress),
        transactionHash,
      });
      res.status(400).json({
        error: "Transaction not found after multiple attempts.",
        retryable: false,
      });
      return;
    }

    if (receipt.status !== "success") {
      log?.warn("payments.verify.txFailed", {
        wallet: maskAddress(walletAddress),
        transactionHash,
      });
      res.status(400).json({ error: "Transaction failed" });
      return;
    }

    const token = tokenAddress
      ? SUPPORTED_CURRENCIES.find(
          (c) => c.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
        )
      : SUPPORTED_CURRENCIES.find((c) => c.symbol === "USDm");

    if (!token) {
      log?.warn("payments.verify.unsupportedToken", { tokenAddress });
      res.status(400).json({ error: "Unsupported payment token" });
      return;
    }

    const transferEventSignature =
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

    const transferLog = receipt.logs.find(
      (entry) =>
        entry.address.toLowerCase() === token.tokenAddress.toLowerCase() &&
        entry.topics[0] === transferEventSignature &&
        entry.topics[2] &&
        `0x${entry.topics[2].slice(-40)}`.toLowerCase() === PAYMENT_RECIPIENT.toLowerCase()
    );

    if (!transferLog) {
      log?.warn("payments.verify.transferEventMissing", {
        wallet: maskAddress(walletAddress),
        token: token.symbol,
      });
      res.status(400).json({
        error: `${token.symbol} Transfer event not found in transaction`,
      });
      return;
    }

    const fromAddress = `0x${transferLog.topics[1]?.slice(-40)}`;
    const toAddress = `0x${transferLog.topics[2]?.slice(-40)}`;
    const amount = BigInt(transferLog.data).toString();

    const { unlockAmountUsd, unlockDurationHours } = await getAccessConfig();

    const usdValue = typeof amountUsd === "string" ? amountUsd : unlockAmountUsd;
    let expectedAmount: string;
    try {
      expectedAmount = parseUnits(usdValue, token.decimals).toString();
    } catch {
      expectedAmount = parseUnits(unlockAmountUsd, token.decimals).toString();
    }

    if (
      fromAddress.toLowerCase() !== walletAddress.toLowerCase() ||
      toAddress.toLowerCase() !== PAYMENT_RECIPIENT.toLowerCase() ||
      amount !== expectedAmount
    ) {
      log?.warn("payments.verify.mismatch", {
        wallet: maskAddress(walletAddress),
        transactionHash,
        fromMatch: fromAddress.toLowerCase() === walletAddress.toLowerCase(),
        toMatch: toAddress.toLowerCase() === PAYMENT_RECIPIENT.toLowerCase(),
        amountMatch: amount === expectedAmount,
        amount,
        expectedAmount,
      });
      res.status(400).json({
        error: "Transaction details do not match payment requirements",
      });
      return;
    }

    log?.info("payments.verify.success", {
      wallet: maskAddress(walletAddress),
      transactionHash,
      amount,
    });

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
    log?.info("payments.verify.saved", { paymentId: paymentRecord._id.toString() });

    res.json({
      verified: true,
      message: "Payment verified successfully",
      expiresAt: expiresAt?.toISOString(),
    });
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    log?.error("payments.verify.failed", err);
    res.status(500).json({ error: "Payment verification failed" });
  }
});

export default router;
