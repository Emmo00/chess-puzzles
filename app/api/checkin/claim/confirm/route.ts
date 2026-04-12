import { NextRequest, NextResponse } from "next/server";

import { authenticateWalletUser } from "@/lib/auth";
import { PAYOUT_CLAIM_CONTRACT } from "@/lib/config/wagmi";
import dbConnect from "@/lib/db";
import CheckInContractService from "@/lib/services/checkin-contract.service";
import CheckInService from "@/lib/services/checkin.service";

const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const user = await authenticateWalletUser(request);
    const { txHash } = await request.json();

    if (!txHash || typeof txHash !== "string" || !TX_HASH_REGEX.test(txHash)) {
      return NextResponse.json(
        { message: "Invalid txHash provided" },
        { status: 400 }
      );
    }

    const checkInService = new CheckInService();
    const contractService = new CheckInContractService();

    const reservation = await checkInService.markClaiming(user.walletAddress, txHash);
    if (reservation.status === "claimed") {
      return NextResponse.json({
        success: true,
        alreadyClaimed: true,
        txHash: reservation.claimTxHash,
        claimedAt: reservation.claimedAt,
      });
    }

    const publicClient = contractService.getPublicClient();

    let receipt;
    try {
      receipt = await publicClient.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });
    } catch (error: any) {
      if (error.name === "TransactionReceiptNotFoundError") {
        return NextResponse.json(
          {
            success: false,
            retryable: true,
            message: "Transaction is pending confirmation",
          },
          { status: 202 }
        );
      }
      throw error;
    }

    if (receipt.status !== "success") {
      await checkInService.markFailedClaim(
        user.walletAddress,
        txHash,
        "Transaction reverted"
      );

      return NextResponse.json(
        {
          success: false,
          message: "Transaction reverted",
        },
        { status: 400 }
      );
    }

    const transaction = await publicClient.getTransaction({
      hash: txHash as `0x${string}`,
    });

    const fromMatches =
      transaction.from.toLowerCase() === user.walletAddress.toLowerCase();
    const toMatches =
      transaction.to?.toLowerCase() === PAYOUT_CLAIM_CONTRACT.toLowerCase();

    if (!fromMatches || !toMatches) {
      await checkInService.markFailedClaim(
        user.walletAddress,
        txHash,
        "Transaction sender/recipient mismatch"
      );

      return NextResponse.json(
        {
          success: false,
          message: "Transaction does not match daily claim contract call",
        },
        { status: 400 }
      );
    }

    const claimedReservation = await checkInService.markClaimed(
      user.walletAddress,
      txHash
    );

    return NextResponse.json({
      success: true,
      status: claimedReservation.status,
      txHash,
      claimedAt: claimedReservation.claimedAt,
    });
  } catch (error: any) {
    console.error("Error confirming check-in claim:", error);
    return NextResponse.json(
      { message: error.message || "Failed to confirm check-in claim" },
      { status: error.status || 500 }
    );
  }
}
