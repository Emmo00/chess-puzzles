'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

export interface UserStats {
  walletAddress: string
  displayName: string
  username?: string
  currentStreak: number
  longestStreak: number
  totalPuzzlesSolved: number
  points: number
  lastLogin: string
  lastPuzzleDate?: string | null
}

export function useUserStats() {
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { address, isConnected } = useAccount()

  const fetchUserStats = async () => {
    if (!address || !isConnected) {
      setUserStats(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/users/me?walletAddress=${address}`, {
        headers: {
          'x-wallet-address': address,
        },
      })
      if (response.ok) {
        const userData = await response.json()
        setUserStats(userData)
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch user stats' }))
        throw new Error(errorData.message || 'Failed to fetch user stats')
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch user stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserStats()
  }, [address, isConnected])

  return {
    userStats,
    loading,
    error,
    refetch: fetchUserStats
  }
}