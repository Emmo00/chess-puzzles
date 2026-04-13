import { NextResponse } from "next/server";

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

export async function GET() {
  const manifest = {
    accountAssociation: {
      header: process.env.FARCASTER_HEADER || "",
      payload: process.env.FARCASTER_PAYLOAD || "",
      signature: process.env.FARCASTER_SIGNATURE || "",
    },
    miniapp: {
      version: "1",
      name: "Chess Puzzles",
      iconUrl: buildAppUrl("/chess-puzzles.svg"),
      homeUrl: buildAppUrl("/"),
      imageUrl: buildAppUrl("/api/og"),
      buttonTitle: "Play Chess Puzzles",
      splashImageUrl: buildAppUrl("/chess-puzzles.svg"),
      splashBackgroundColor: "#fff9ec",
      webhookUrl: buildAppUrl("/api/webhooks/farcaster"),
      subtitle: "Master Your Tactics",
      description: "Solve daily chess puzzles, track streaks, and compete on the leaderboard.",
      primaryCategory: "games",
      tags: ["chess", "puzzles", "strategy"],
      heroImageUrl: buildAppUrl("/api/og"),
      ogTitle: "Chess Puzzles",
      ogDescription: "Solve daily chess puzzles, track streaks, and compete on the leaderboard.",
      ogImageUrl: buildAppUrl("/api/og"),
    },
  };

  return NextResponse.json(manifest, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
