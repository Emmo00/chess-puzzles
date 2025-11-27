import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const manifest = {
    accountAssociation: {
      header: process.env.FARCASTER_ACCOUNT_ASSOCIATION_HEADER || "placeholder-header-will-be-replaced",
      payload: process.env.FARCASTER_ACCOUNT_ASSOCIATION_PAYLOAD || "placeholder-payload-will-be-replaced", 
      signature: process.env.FARCASTER_ACCOUNT_ASSOCIATION_SIGNATURE || "placeholder-signature-will-be-replaced"
    },
    miniapp: {
      version: "1",
      name: "Chess Puzzles",
      iconUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/icon.png`,
      homeUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}`,
      imageUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/og`,
      buttonTitle: "🏁 Play Puzzles", 
      splashImageUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/icon.png`,
      splashBackgroundColor: "#1a1a1a",
      description: "Solve challenging chess puzzles and improve your tactical skills",
      subtitle: "Master Chess Tactics",
      primaryCategory: "games",
      tags: ["chess", "puzzles", "tactics", "strategy"],
      heroImageUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/og?title=Chess%20Puzzles&subtitle=Master%20Your%20Tactics`,
      tagline: "Master Chess Tactics", 
      ogTitle: "Chess Puzzles - Master Your Tactics",
      ogDescription: "Challenge yourself with engaging chess puzzles and improve your tactical skills",
      ogImageUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/og`,
      ...(process.env.FARCASTER_WEBHOOK_URL && { webhookUrl: process.env.FARCASTER_WEBHOOK_URL })
    }
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}