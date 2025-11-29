"use client"

import { useState, useEffect } from "react"
import ChessPiecesScene from "@/components/chess-pieces-scene"
import StreakBadge from "@/components/streak-badge"
import CTABlock from "@/components/cta-block"
import PremiumBanner from "@/components/premium-banner"
import { WalletConnect } from "@/components/WalletConnect"

export default function Home() {
  const [mounted, setMounted] = useState(false)

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
      {/* Header with Streak Badge and Wallet */}
      <header className="pt-4 px-4 flex justify-between items-center shrink-0">
        <WalletConnect />
        <StreakBadge days={12} />
      </header>

      {/* Main Content - Centered, No Scroll */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 overflow-hidden gap-4">

        {/* Headline */}
        <h1 className="text-5xl font-black text-center leading-tight max-w-sm text-balance">
          Be the King of Chess
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
