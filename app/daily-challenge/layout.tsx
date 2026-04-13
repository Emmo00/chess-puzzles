import type React from "react";
import type { Metadata } from "next";

const FALLBACK_APP_URL = "https://example.com";

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
  imageUrl: buildAppUrl("/api/og?title=Daily%20Challenge&subtitle=Solve%20today%27s%20puzzle"),
  button: {
    title: "Start Daily Challenge",
    action: {
      type: "launch_miniapp",
      name: "Chess Puzzles",
      url: buildAppUrl("/daily-challenge"),
      splashImageUrl: buildAppUrl("/chess-puzzles.svg"),
      splashBackgroundColor: "#fff9ec",
    },
  },
} as const;

export const metadata: Metadata = {
  other: {
    "fc:miniapp": JSON.stringify(miniAppEmbed),
  },
};

export default function DailyChallengeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
