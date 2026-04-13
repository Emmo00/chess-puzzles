import type React from "react";
import type { Metadata } from "next";
import Script from "next/script";

import "./globals.css";
import { WalletProvider } from "../lib/providers/WalletProvider";
import { FarcasterMiniAppReady } from "@/components/FarcasterMiniAppReady";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";

// Initialize fonts
const inter = Inter({ subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"] });
const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

const FALLBACK_APP_URL = "https://chesspuzzles.xyz";
const appBaseUrl = (() => {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || FALLBACK_APP_URL;
  try {
    return new URL(configuredUrl);
  } catch {
    return new URL(FALLBACK_APP_URL);
  }
})();

const buildAppUrl = (path: string) => new URL(path, appBaseUrl).toString();

const miniAppEmbed = {
  version: "1",
  imageUrl: buildAppUrl("/api/og"),
  button: {
    title: "Play Chess Puzzles",
    action: {
      type: "launch_miniapp",
      name: "Chess Puzzles",
      url: buildAppUrl("/"),
      splashImageUrl: buildAppUrl("/chess-puzzles.svg"),
      splashBackgroundColor: "#fff9ec",
    },
  },
} as const;



export const metadata: Metadata = {
  title: "Chess Puzzles - Master Your Tactics",
  description: "Solve challenging chess puzzles and improve your tactical skills",
  generator: "Chess Puzzles App",
  metadataBase: appBaseUrl,
  openGraph: {
    title: "Chess Puzzles - Master Your Tactics",
    description: "Challenge yourself with engaging chess puzzles and improve your tactical skills",
    images: [
      {
        url: buildAppUrl("/api/og"),
        width: 1200,
        height: 630,
        alt: "Chess Puzzles App",
      },
    ],
    type: "website",
  },
  other: {
    "fc:miniapp": JSON.stringify(miniAppEmbed),
  },

  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
      {
        url: "/favicon.ico",
      },
    ],
    shortcut: "/favicon.svg",
    apple: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="talentapp:project_verification" content="44156f46d8761b652f56dfd70ed3225d67f0125aca67276ace896a974edcfe491f5da33ad557bec3583760ec78463fa110f8d4f08c7fee73d932fe741b556953" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-TPBVDV2BQ9"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-TPBVDV2BQ9');
          `}
        </Script>
      </head>
      <body className={`${inter.className} antialiased`}>
        <WalletProvider>
          <FarcasterMiniAppReady />
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
