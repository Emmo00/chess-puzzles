'use client'

import { useState, useEffect } from 'react'
import { PremiumStatus, UserStats, StreakData } from '@/lib/types'
import { getPremiumStatus } from '@/lib/utils/premium'
import Link from 'next/link'

interface StreakModalProps {
  isOpen: boolean
  onClose: () => void
  userStats: UserStats | StreakData | null
}

export function StreakModal({ isOpen, onClose, userStats }: StreakModalProps) {
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isOpen && userStats) {
      setIsLoading(true)
      
      // Handle both UserStats and StreakData types
      let status: PremiumStatus
      if ('premiumStatus' in userStats) {
        // StreakData already has premiumStatus
        status = userStats.premiumStatus
      } else {
        // UserStats needs to be converted
        status = getPremiumStatus(userStats)
      }
      
      setPremiumStatus(status)
      setIsLoading(false)
    }
  }, [isOpen, userStats])

  const handleClose = () => {
    onClose()
  }

  if (!isOpen) return null

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  const getNextRewardText = () => {
    if (!userStats || !premiumStatus?.nextRewardAt) return null
    const daysUntilReward = premiumStatus.nextRewardAt - userStats.currentStreak
    return `${daysUntilReward} more days until next reward`
  }

  return (
    <div className="fixed inset-0 z-50 p-4 flex items-center justify-center pointer-events-auto">
      {/* Neo-brutalist backdrop */}
      <div 
        className="absolute inset-0 bg-black/80"
        onClick={handleClose}
      />
      
      {/* Neo-brutalist modal */}
      <div className="relative bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] max-w-md w-full max-h-[85vh] transform rotate-1 flex flex-col">
        {/* Fixed header */}
        <div className="bg-purple-400 border-b-4 border-black p-4 shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase tracking-wider text-black">
              🔥 Your Streak
            </h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 bg-red-500 border-2 border-black font-black text-black hover:bg-red-400 transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="p-6 bg-white space-y-6 overflow-y-auto flex-1 min-h-0">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-black border-4 border-purple-400 animate-bounce">
                <div className="w-full h-full bg-purple-400 border-2 border-black animate-pulse"></div>
              </div>
              <p className="font-black text-black uppercase tracking-wide">Loading...</p>
            </div>
          ) : (
            <>
              {/* Streak Summary */}
              <div className="bg-orange-300 border-4 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform -rotate-1">
                <h3 className="font-black text-lg uppercase text-black mb-3">📊 Streak Stats</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">Current Streak:</span>
                    <span className="bg-black text-orange-300 px-3 py-1 font-black text-xl">
                      {userStats?.currentStreak || 0} days
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">Longest Streak:</span>
                    <span className="font-black text-black">{userStats?.longestStreak || 0} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">Last Puzzle:</span>
                    <span className="font-black text-black">{formatDate(userStats?.lastPuzzleDate || null)}</span>
                  </div>
                </div>
                {getNextRewardText() && (
                  <div className="bg-yellow-300 border-2 border-black p-2 mt-3 transform rotate-1">
                    <p className="text-xs font-bold text-black uppercase text-center">
                      🎯 {getNextRewardText()}
                    </p>
                  </div>
                )}
              </div>

              {/* Monetization Explanation */}
              <div className="bg-cyan-200 border-4 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform rotate-1">
                <h3 className="font-black text-lg uppercase text-black mb-3">💡 How It Works</h3>
                <p className="text-sm font-bold text-black leading-relaxed">
                  Maintain your daily streak to earn free premium days. Premium days let you solve unlimited puzzles. 
                  At certain streak milestones, you automatically receive free premium days that activate immediately 
                  or stack if you already have premium. Check your premium status below!
                </p>
              </div>

              {/* Premium Status */}
              <div className={`border-4 border-black p-4 shadow-[6px_6px_0px_rgba(0,0,0,1)] transform -rotate-1 ${
                premiumStatus?.isActive ? 'bg-green-400' : 'bg-red-300'
              }`}>
                <h3 className="font-black text-lg uppercase text-black mb-3">
                  {premiumStatus?.isActive ? '👑 Premium Active!' : '⚠️ Premium Inactive'}
                </h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">Status:</span>
                    <span className={`px-3 py-1 font-black border-2 border-black ${
                      premiumStatus?.isActive ? 'bg-black text-green-400' : 'bg-black text-red-300'
                    }`}>
                      {premiumStatus?.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">Free Days Left:</span>
                    <span className="font-black text-black">{premiumStatus?.freeDaysRemaining || 0}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">Premium Expires:</span>
                    <span className="font-black text-black text-xs">
                      {formatDate(premiumStatus?.paidExpiryDate || null)}
                    </span>
                  </div>
                  
                  {premiumStatus?.paidExpiryDate && (
                    <div className="bg-blue-200 border-2 border-black p-2 mt-2 text-center">
                      <p className="text-xs font-bold text-black">
                        💎 Premium lasts for 1 month (30 days)
                      </p>
                    </div>
                  )}
                </div>

                {/* Upsell for inactive premium */}
                {!premiumStatus?.isActive && (
                  <div className="bg-yellow-300 border-2 border-black p-3 mt-4 transform rotate-2">
                    <p className="text-xs font-bold text-black uppercase text-center mb-2">
                      🚀 Want Unlimited Puzzles?
                    </p>
                    <Link
                      href="/"
                      onClick={handleClose}
                      className="block w-full bg-black text-yellow-300 py-2 px-3 font-black text-xs uppercase tracking-wider border-2 border-yellow-300 text-center hover:bg-gray-800 transition-colors"
                    >
                      Get Premium Now
                    </Link>
                  </div>
                )}
              </div>

              {/* Streak Rewards Table */}
              <div className="bg-lime-300 border-4 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform rotate-1">
                <h3 className="font-black text-lg uppercase text-black mb-3">🎁 Streak Rewards</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold text-black uppercase">
                    <span>Streak Days</span>
                    <span>Free Premium</span>
                  </div>
                  {[
                    { days: 7, reward: '1 Day' },
                    { days: 21, reward: '3 Days' },
                    { days: 30, reward: '5 Days' },
                    { days: '60+', reward: '+5 Days Each 30' }
                  ].map((item, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 text-xs font-bold text-black">
                      <span>{item.days} days</span>
                      <span className="text-lime-800">{item.reward}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}