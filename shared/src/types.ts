export * from "./contracts";

export interface WalletUser {
  address: string;
}

export interface UserSettings {
  ratingRange: { min: number; max: number };
  disabledThemes: string[];
}

export interface UserStats {
  totalSolved: number;
  totalCorrect: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  rating: number;
  level: number;
}

export interface Puzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
  title?: string;
}

export interface UserPuzzle {
  puzzleId: string;
  walletAddress: string;
  solved: boolean;
  attempts: number;
  hintsUsed: number;
  pointsEarned: number;
  rating: number;
  solveTimeSec?: number;
  createdAt: Date;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCheckIn?: Date;
  streakFreezes: number;
}

export interface PaymentStatus {
  hasAccess: boolean;
  accessExpiresAt?: Date;
  paymentType?: string;
  amount?: number;
}

export type PaymentType = "DAILY_ACCESS" | "STORE_PURCHASE";
