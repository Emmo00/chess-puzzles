import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { apiFetch } from '@/lib/api';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalPuzzlesSolved: number;
  points: number;
  lastLogin: string;
  lastPuzzleDate: string | null;
}

interface UseStreakReturn {
  streakData: StreakData | null;
  isLoading: boolean;
  error: string | null;
  updateStreak: () => Promise<{ success: boolean; rewardGranted?: any }>;
  refreshStreak: () => Promise<void>;
}

export function useStreak(): UseStreakReturn {
  const { address } = useAccount();
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStreakData = async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch('/api/users/streak', {
        headers: {
          'Authorization': `Bearer ${address}`,
          'x-wallet-address': address,
        },
      });
      setStreakData(data);
    } catch (err) {
      console.error('Streak fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStreak = async (): Promise<{ success: boolean; rewardGranted?: any }> => {
    if (!address) {
      throw new Error('No wallet connected');
    }

    try {
      const result = await apiFetch('/api/users/streak', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${address}`,
        },
        body: JSON.stringify({ walletAddress: address }),
      });
      
      // Refresh streak data after update
      await fetchStreakData();
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return { success: false };
    }
  };

  const refreshStreak = async () => {
    await fetchStreakData();
  };

  useEffect(() => {
    if (address) {
      fetchStreakData();
    }
  }, [address]);

  return {
    streakData,
    isLoading,
    error,
    updateStreak,
    refreshStreak,
  };
}