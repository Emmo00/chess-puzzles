export interface QuickAuthUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

export interface UserStats {
  points: number;
  currentStreak: number;
  lastLoggedIn: Date;
  longestStreak: number;
  totalPuzzlesSolved: number;
}

export interface UserPuzzle {
  userfid: number;
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

// Extended NextRequest interface
export interface AuthenticatedRequest {
  user?: QuickAuthUser | null;
}