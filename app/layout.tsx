import type React from "react";
import type { Metadata } from "next";

import "./globals.css";
import { WalletProvider } from "../lib/providers/WalletProvider";
import { ChainNotification } from "../components/ChainNotification";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";

// Initialize fonts
const inter = Inter({ subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"] });
const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});



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
        alt: "Chess Puzzles App",
      },
    ],
    type: "website",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
      </head>
      <body className={`${inter.className} antialiased`}>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
