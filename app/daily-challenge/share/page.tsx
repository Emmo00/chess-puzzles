import type { Metadata } from "next";
import Link from "next/link";

import { getDailyChallengeShareData, parseUtcDayInput } from "@/lib/services/daily-challenge-share.service";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams: Promise<SearchParams> | SearchParams;
};

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

const pickFirst = (value: string | string[] | undefined, fallback: string) => {
  if (Array.isArray(value)) {
    return value[0] || fallback;
  }

  return value || fallback;
};

const getSharePayload = async (input: Promise<SearchParams> | SearchParams) => {
  const params = await Promise.resolve(input);
  const utcDay = parseUtcDayInput(pickFirst(params.d, pickFirst(params.day, "")));
  const shareData = await getDailyChallengeShareData(utcDay);

  return {
    utcDay,
    day: shareData?.dayLabel || new Date(utcDay * 86400000).toISOString().slice(0, 10),
    rating: shareData?.rating ? String(shareData.rating) : "?",
    reward: shareData?.rewardLabel || "Reward available for early solvers",
  };
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { utcDay, rating, reward, day } = await getSharePayload(searchParams);

  const title = `Daily Challenge ${day}`;
  const description = `Solve today's ${rating}-rated daily challenge and claim ${reward}.`;
  const imageUrl = buildAppUrl(`/api/og/daily-challenge?d=${encodeURIComponent(String(utcDay))}`);
  const launchUrl = buildAppUrl("/daily-challenge");

  const miniAppEmbed = {
    version: "1",
    imageUrl,
    button: {
      title: "Play Daily Challenge",
      action: {
        type: "launch_miniapp",
        name: "Chess Puzzles",
        url: launchUrl,
        splashImageUrl: buildAppUrl("/chess-puzzles-icon.png"),
        splashBackgroundColor: "#fff9ec",
      },
    },
  } as const;

  return {
    title,
    description,
    metadataBase: appBaseUrl,
    openGraph: {
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 800,
          alt: "Chess Puzzles Daily Challenge",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    other: {
      "fc:miniapp": JSON.stringify(miniAppEmbed),
    },
  };
}

export default async function DailyChallengeSharePage({ searchParams }: PageProps) {
  const { rating, reward, day } = await getSharePayload(searchParams);

  return (
    <main className="min-h-screen bg-[#fff9ec] text-black flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] p-6 text-center space-y-4">
        <h1 className="text-2xl font-black uppercase">Daily Challenge</h1>
        <div className="bg-cyan-300 border-2 border-black p-4 space-y-1">
          <p className="font-black text-sm uppercase">Day {day}</p>
          <p className="font-black text-lg uppercase">Rating {rating}</p>
          <p className="font-black text-sm uppercase">Reward {reward}</p>
        </div>
        <p className="text-sm font-bold uppercase text-black/70">Solve the puzzle. Claim the reward. Share your win.</p>
        <Link
          href="/daily-challenge"
          className="inline-block bg-black text-white px-4 py-2 font-black text-sm border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all"
        >
          Open Daily Challenge
        </Link>
      </div>
    </main>
  );
}
