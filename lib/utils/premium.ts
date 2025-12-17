import { UserStats, PremiumStatus } from '../types';

/**
 * Calculate if user currently has active premium
 */
export function calculateIsPremiumActive(user: UserStats): boolean {
  const now = new Date().toISOString();
  
  // Check paid premium
  const hasPaidPremium = user.paidPremiumExpiry && user.paidPremiumExpiry > now;
  
  // Check free premium days
  const hasFreePremium = user.freePremiumDaysRemaining > 0;
  
  return hasPaidPremium || hasFreePremium;
}

/**
 * Get comprehensive premium status for UI
 */
export function getPremiumStatus(user: UserStats): PremiumStatus {
  const isActive = calculateIsPremiumActive(user);
  
  return {
    isActive,
    freeDaysRemaining: user.freePremiumDaysRemaining,
    paidExpiryDate: user.paidPremiumExpiry,
  };
}

/**
 * Update user streak and check for rewards
 */
export function updateStreak(user: UserStats, currentDate: string): { 
  user: UserStats; 
  rewardGranted?: { days: number; freePremiumDays: number } 
} {
  const today = new Date(currentDate).toDateString();
  const lastPuzzleDate = user.lastPuzzleDate ? new Date(user.lastPuzzleDate).toDateString() : null;
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
  
  let newStreak = user.currentStreak;
  let rewardGranted: { days: number; freePremiumDays: number } | undefined;
  
  if (!lastPuzzleDate || lastPuzzleDate === yesterday) {
    // Continue or start streak
    newStreak = lastPuzzleDate === yesterday ? user.currentStreak + 1 : 1;
  } else if (lastPuzzleDate === today) {
    // Already played today, no change
    newStreak = user.currentStreak;
  } else {
    // Streak broken
    newStreak = 1;
  }
  
  let updatedUser: UserStats = {
    ...user,
    currentStreak: newStreak,
    longestStreak: Math.max(user.longestStreak, newStreak),
    lastPuzzleDate: currentDate
  };
  
  return { user: updatedUser, rewardGranted };
}

/**
 * Check if user can solve more puzzles today
 */
export function canSolvePuzzles(user: UserStats, puzzlesSolvedToday: number): {
  canSolve: boolean;
  isPremium: boolean;
  limit?: number;
} {
  const isPremium = calculateIsPremiumActive(user);
  
  if (isPremium) {
    return { canSolve: true, isPremium: true };
  }
  
  // Non-premium users can solve 3 puzzles per day
  const dailyLimit = 3;
  return {
    canSolve: puzzlesSolvedToday < dailyLimit,
    isPremium: false,
    limit: dailyLimit
  };
}