import { NextRequest, NextResponse } from 'next/server';
import { Payment } from '../../../../lib/models/payment.model';
import { PaymentType } from '../../../../lib/types/payment';
import dbConnect from '../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    const now = new Date();

    // Check for daily access (valid for today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const dailyPayment = await Payment.findOne({
      walletAddress: walletAddress.toLowerCase(),
      paymentType: PaymentType.DAILY_ACCESS,
      verified: true,
      createdAt: { $gte: todayStart },
      expiresAt: { $gt: now },
    }).sort({ createdAt: -1 });

    const hasDailyAccess = !!dailyPayment;
    const hasAccess = hasDailyAccess;

    return NextResponse.json({
      hasAccess,
      hasDailyAccess,
      dailyAccessDate: dailyPayment?.createdAt?.toISOString(),
      message: hasAccess 
        ? 'Daily access active'
        : 'No active access found'
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}