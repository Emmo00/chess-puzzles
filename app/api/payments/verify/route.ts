import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { mainnet, base, celo, celoSepolia } from 'viem/chains';
import { Payment } from '../../../../lib/models/payment.model';
import { PaymentType } from '../../../../lib/types/payment';
import { PAYMENT_RECIPIENT, USDC_ADDRESSES } from '../../../../lib/config/wagmi';
import dbConnect from '../../../../lib/db';

// Create clients for different chains
const clients = {
  [mainnet.id]: createPublicClient({
    chain: mainnet,
    transport: http(),
  }),
  [base.id]: createPublicClient({
    chain: base,
    transport: http(),
  }),
  [celo.id]: createPublicClient({
    chain: celo,
    transport: http(),
  }),
  [celoSepolia.id]: createPublicClient({
    chain: celoSepolia,
    transport: http(),
  }),
};

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { transactionHash, walletAddress, paymentType, chainId } = await request.json();

    // Validate inputs
    if (!transactionHash || !walletAddress || !paymentType || !chainId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ transactionHash });
    if (existingPayment) {
      return NextResponse.json({
        verified: existingPayment.verified,
        message: 'Payment already processed',
      });
    }

    // Get the appropriate client for the chain
    const client = clients[chainId as keyof typeof clients];
    if (!client) {
      return NextResponse.json(
        { error: 'Unsupported chain' },
        { status: 400 }
      );
    }

    // Get transaction receipt
    const receipt = await client.getTransactionReceipt({
      hash: transactionHash as `0x${string}`,
    });

    if (!receipt || receipt.status !== 'success') {
      return NextResponse.json(
        { error: 'Transaction not found or failed' },
        { status: 400 }
      );
    }

    // Get transaction details
    const transaction = await client.getTransaction({
      hash: transactionHash as `0x${string}`,
    });

    // Verify transaction details
    const usdcAddress = USDC_ADDRESSES[chainId as keyof typeof USDC_ADDRESSES];
    const expectedAmount = paymentType === PaymentType.DAILY_ACCESS ? '100000' : '1000000'; // USDC has 6 decimals

    // For ERC20 transfers, we need to check the logs
    const transferLog = receipt.logs.find(log => 
      log.address.toLowerCase() === usdcAddress.toLowerCase()
    );

    if (!transferLog) {
      return NextResponse.json(
        { error: 'USDC transfer not found in transaction' },
        { status: 400 }
      );
    }

    // Decode transfer log (simplified - in production use proper ABI decoding)
    // Transfer event: Transfer(address indexed from, address indexed to, uint256 value)
    const fromAddress = `0x${transferLog.topics[1]?.slice(-40)}`;
    const toAddress = `0x${transferLog.topics[2]?.slice(-40)}`;
    const amount = parseInt(transferLog.data, 16).toString();

    // Verify the transfer details
    if (
      fromAddress.toLowerCase() !== walletAddress.toLowerCase() ||
      toAddress.toLowerCase() !== PAYMENT_RECIPIENT.toLowerCase() ||
      amount !== expectedAmount
    ) {
      return NextResponse.json(
        { error: 'Transaction details do not match payment requirements' },
        { status: 400 }
      );
    }

    // Calculate expiry for premium payments
    const expiresAt = paymentType === PaymentType.PREMIUM 
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

    return NextResponse.json({
      verified: true,
      message: 'Payment verified successfully',
      expiresAt: expiresAt?.toISOString(),
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Payment verification failed' },
      { status: 500 }
    );
  }
}