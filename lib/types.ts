// New wallet-based user interface
export interface WalletUser {
  walletAddress: string;
  displayName: string;
  username?: string;
}

export interface UserSettings {
  ratingRange: {
    min: number;
    max: number;
  };
  disabledThemes: string[];
}

export interface UserStats {
  totalPoints: number;
  currentStreak: number;
  lastLogin: Date;
  longestStreak: number;
  totalPuzzlesSolved: number;
  lastPuzzleDate: string | null;
}

export interface UserPuzzle {
  userWalletAddress: string;
  puzzleId: string;
  completed: boolean;
  attempts: number;
  type: "solve" | "daily";
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

export interface StreakModalState {
  isOpen: boolean;
  isLoading: boolean;
  hasError: boolean;
}

// StreakData interface from useStreak hook
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalPuzzlesSolved: number;
  points: number;
  lastLogin: string;
  lastPuzzleDate: string | null;
}

// Extended NextRequest interface
export interface AuthenticatedRequest {
  user?: WalletUser | null;
}