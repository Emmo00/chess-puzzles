import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import userModel from '@/lib/models/users.model';
import { consumeFreePremiumDay } from '@/lib/utils/premium';

export async function POST(request: NextRequest) {
  try {
    // Verify this is a system call (in production, add proper authentication)
    const { secret } = await request.json();
    
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Find all users with free premium days remaining
    const usersWithFreePremium = await userModel.find({
      freePremiumDaysRemaining: { $gt: 0 }
    });

    let updatedCount = 0;

    // Update each user's free premium days
    for (const user of usersWithFreePremium) {
      const updatedUser = consumeFreePremiumDay(user);
      
      await userModel.findByIdAndUpdate(user._id, {
        freePremiumDaysRemaining: updatedUser.freePremiumDaysRemaining
      });
      
      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} users' premium days`,
      updatedCount
    });

  } catch (error) {
    console.error('Error consuming premium days:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}