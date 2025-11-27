import type React from "react"
// <CHANGE> Added Three.js script tag for 3D chess pieces
import type { Metadata } from "next"

import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { MiniAppProvider } from "../lib/contexts/MiniAppContext"

import { Inter, JetBrains_Mono, Source_Serif_4 } from 'next/font/google'

// Initialize fonts
const inter = Inter({ subsets: ['latin'] })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'] })
const sourceSerif4 = Source_Serif_4({ subsets: ['latin'], weight: ["200","300","400","500","600","700","800","900"] })

const miniAppEmbed = {
  version: "1",
  imageUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/og`,
  button: {
    title: "🏁 Play Puzzles",
    action: {
      type: "launch_miniapp",
      name: "Chess Puzzles",
      url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}`,
      splashImageUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/icon.png`,
      splashBackgroundColor: "#1a1a1a"
    }
  }
}

export const metadata: Metadata = {
  title: "Chess Puzzles - Master Your Tactics",
  description: "Solve challenging chess puzzles and improve your tactical skills",
  generator: "Chess Puzzles App",
  openGraph: {
    title: "Chess Puzzles - Master Your Tactics",
    description: "Challenge yourself with engaging chess puzzles and improve your tactical skills",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Chess Puzzles App"
      }
    ],
    type: "website"
  },
  other: {
    "fc:miniapp": JSON.stringify(miniAppEmbed),
    "fc:frame": JSON.stringify(miniAppEmbed) // For backward compatibility
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
      </head>
      <body className={`${inter.className} antialiased`}>
        <MiniAppProvider>
          {children}
        </MiniAppProvider>
        <Analytics />
      </body>
    </html>
  )
}
