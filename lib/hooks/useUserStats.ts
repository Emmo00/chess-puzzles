'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAccount } from 'wagmi'

export type StreakStatus = "alive" | "at_risk" | "broken";

export interface UserStats {
  walletAddress: string
  displayName: string
  username?: string
  currentStreak: number
  longestStreak: number
  totalPuzzlesSolved: number
  points: number
  streakStatus: StreakStatus
  streakFreezes: number
  lastLogin: string
  lastPuzzleDate?: string | null
}

const inFlight: Record<string, Promise<UserStats>> = {}

export function useUserStats() {
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { address, isConnected } = useAccount()
  const fetchedAddressRef = useRef<string | null>(null)

  const fetchUserStats = useCallback(() => {
    if (!address || !isConnected) {
      setUserStats(null)
      return Promise.resolve(null)
    }

    setLoading(true)
    setError(null)

    const key = address.toLowerCase()

    if (Object.prototype.hasOwnProperty.call(inFlight, key)) {
      return inFlight[key]
        .then((stats) => {
          setUserStats(stats)
          setLoading(false)
          return stats
        })
        .catch((err: Error) => {
          setError(err.message)
          setLoading(false)
          return null
        })
    }

    const promise = fetch(`/api/users/streak?walletAddress=${address}`, {
      headers: {
        'x-wallet-address': address,
      },
    })
      .then(async (response) => {
        if (response.ok) {
          const userData = await response.json()
          return {
            walletAddress: address,
            displayName: '',
            currentStreak: userData.currentStreak ?? 0,
            longestStreak: userData.longestStreak ?? 0,
            totalPuzzlesSolved: userData.totalPuzzlesSolved ?? 0,
            points: userData.points ?? 0,
            streakStatus: userData.streakStatus ?? 'alive',
            streakFreezes: userData.streakFreezes ?? 0,
            lastLogin: userData.lastLogin ?? '',
            lastPuzzleDate: userData.lastPuzzleDate ?? null,
          } as UserStats
        }
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch user stats' }))
        throw new Error(errorData.message || 'Failed to fetch user stats')
      })
      .finally(() => {
        delete inFlight[key]
      })

    inFlight[key] = promise

    return promise
      .then((stats) => {
        setUserStats(stats)
        setError(null)
        return stats
      })
      .catch((err: Error) => {
        console.error('Error fetching user stats:', err)
        setError(err.message)
        return null
      })
      .finally(() => {
        setLoading(false)
      })
  }, [address, isConnected])

  useEffect(() => {
    if (!address || !isConnected) {
      fetchedAddressRef.current = null
      setUserStats(null)
      return
    }
    const key = address.toLowerCase()
    if (fetchedAddressRef.current === key) return
    fetchedAddressRef.current = key
    fetchUserStats()
  }, [address, isConnected, fetchUserStats])

  return {
    userStats,
    loading,
    error,
    refetch: fetchUserStats
  }
}
