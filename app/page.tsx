"use client"

import { useState, useEffect } from "react"
import ChessPiecesScene from "@/components/chess-pieces-scene"
import StreakBadge from "@/components/streak-badge"
import CTABlock from "@/components/cta-block"
import PremiumBanner from "@/components/premium-banner"
import { MiniAppAuth } from "../components/MiniAppAuth"
import { useMiniAppContext } from "@/lib/contexts/MiniAppContext"

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const { isInMiniApp, user, isLoading } = useMiniAppContext()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const ctaBlocks = [
    {
      id: 1,
      title: "Solve Puzzles",
      subtitle: "3 Free Daily",
      accentColor: "bg-cyan-400",
      icon: "▲",
      href: "/solve",
    },
    {
      id: 2,
      title: "Puzzle Rush",
      subtitle: "1 Round Daily",
      accentColor: "bg-magenta-500",
      icon: "⚡",
      href: "/rush",
    },
    {
      id: 3,
      title: "Leaderboard",
      subtitle: "$CHESS Rewards",
      accentColor: "bg-yellow-400",
      icon: "★",
      href: "#",
    },
    {
      id: 4,
      title: "Settings",
      subtitle: "Rating Range, Themes",
      accentColor: "bg-lime-400",
      icon: "⚙",
      href: "#",
    },
  ]

  return (
    <div className="w-screen h-screen bg-white text-black flex flex-col overflow-hidden">
      {/* Header with Streak Badge and MiniApp indicator */}
      <header className="pt-4 px-4 flex justify-between items-center shrink-0">
        <div>
          {isInMiniApp && (
            <div className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
              Farcaster App
            </div>
          )}
        </div>
        <StreakBadge days={user ? 12 : 0} />
      </header>

      {/* Main Content - Centered, No Scroll */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 overflow-hidden gap-4">
        {/* MiniApp Authentication */}
        {!isLoading && (
          <div className="w-full max-w-sm shrink-0">
            <MiniAppAuth />
          </div>
        )}

        {/* Headline */}
        <h1 className="text-5xl font-black text-center leading-tight max-w-sm text-balance">
          {user ? `Welcome, ${user.displayName || user.username}!` : "Be the King of Chess"}
        </h1>

        {/* 3D Chess Pieces Scene */}
        <div className="w-full max-w-xs aspect-square shrink-0">
          <ChessPiecesScene />
        </div>

        {/* 4 CTA Blocks - Responsive Grid */}
        <div className="w-full max-w-sm grid grid-cols-2 gap-2 shrink-0">
          {ctaBlocks.map((cta) => (
            <CTABlock
              key={cta.id}
              title={cta.title}
              subtitle={cta.subtitle}
              accentColor={cta.accentColor}
              icon={cta.icon}
              href={cta.href}
            />
          ))}
        </div>
      </main>

      {/* Premium Banner - Bottom */}
      <PremiumBanner />
    </div>
  )
}
