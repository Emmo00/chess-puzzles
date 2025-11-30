export interface QuickAuthUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

// New wallet-based user interface
export interface WalletUser {
  walletAddress: string;
  displayName: string;
  username?: string;
}

export interface UserStats {
  points: number;
  currentStreak: number;
  lastLoggedIn: Date;
  longestStreak: number;
  totalPuzzlesSolved: number;
  // Premium and streak monetization fields
  lastPuzzleDate: string | null;
  freePremiumDaysRemaining: number;
  paidPremiumExpiry: string | null;
  isPremiumActive?: boolean; // Derived field
}

export interface UserPuzzle {
  userfid: string; // Changed to string to support wallet addresses
  puzzleId: string;
  completed: boolean;
  attempts: number;
  type: "free" | "premium";
  points: number;
  solvedAt?: Date;
  createdAt: Date;
}

export interface Puzzle {
  puzzleid: string;
  fen: string;
  rating: number;
  ratingdeviation: number;
  moves: string[];
  themes: string[];
}

// Streak reward configuration
export interface StreakReward {
  days: number;
  freePremiumDays: number;
}

export interface StreakRewardsConfig {
  streakRewards: StreakReward[];
}

// Premium status for UI
export interface PremiumStatus {
  isActive: boolean;
  freeDaysRemaining: number;
  paidExpiryDate: string | null;
  nextRewardAt?: number;
}

// Streak reward configuration
export interface StreakReward {
  days: number;
  freePremiumDays: number;
}

export interface StreakRewardsConfig {
  streakRewards: StreakReward[];
}

// Premium status for UI
export interface PremiumStatus {
  isActive: boolean;
  freeDaysRemaining: number;
  paidExpiryDate: string | null;
  nextRewardAt?: number;
}

export interface StreakModalState {
  isOpen: boolean;
  isLoading: boolean;
  hasError: boolean;
}

// Extended NextRequest interface
export interface AuthenticatedRequest {
  user?: WalletUser | null;
}