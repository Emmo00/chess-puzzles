import { NextRequest, NextResponse } from 'next/server';
import { Payment } from '../../../../lib/models/payment.model';
import { PaymentType } from '../../../../lib/types/payment';
import userModel from '../../../../lib/models/users.model';
import { calculateIsPremiumActive, getPremiumStatus } from '../../../../lib/utils/premium';
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

    // Check for active premium subscription
    const premiumPayment = await Payment.findOne({
      walletAddress: walletAddress.toLowerCase(),
      paymentType: PaymentType.PREMIUM,
      verified: true,
      expiresAt: { $gt: now },
    }).sort({ createdAt: -1 });

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

    // Check user's streak-based premium status
    const user = await userModel.findOne({ walletAddress: walletAddress.toLowerCase() });
    const hasStreakPremium = user ? calculateIsPremiumActive(user) : false;
    const streakPremiumStatus = user ? getPremiumStatus(user) : null;

    const hasPremium = !!premiumPayment;
    const hasDailyAccess = !!dailyPayment;
    const hasAccess = hasPremium || hasDailyAccess || hasStreakPremium;

    return NextResponse.json({
      hasAccess,
      hasPremium,
      premiumExpiresAt: premiumPayment?.expiresAt?.toISOString(),
      hasDailyAccess,
      dailyAccessDate: dailyPayment?.createdAt?.toISOString(),
      hasStreakPremium,
      streakPremiumStatus,
      message: hasAccess 
        ? (hasStreakPremium ? 'Free premium from streak active' : hasPremium ? 'Premium access active' : 'Daily access active')
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