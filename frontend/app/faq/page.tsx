"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleHelp, Puzzle, Settings, Smartphone, Trophy } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { SiteFooter } from "@/components/SiteFooter";

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "How do I solve a puzzle?",
    answer: "Click on a piece to select it, then click on the square you want to move it to. You need to find the best move(s) in the position. The puzzle is complete when you've made all the correct moves in the sequence."
  },
  {
    question: "What happens if I make a wrong move?",
    answer: "Don't worry! If you make a wrong move, the board will highlight it in red. Click the RETRY button to undo your move and try again. Wrong moves pause play but no longer reduce your score directly — they're still recorded for your analysis."
  },
  {
    question: "How do hints work?",
    answer: "Hints are revealed in two stages: first click highlights the piece to move, second click highlights the destination. Each stage consumes one hint from your hint balance. New accounts start with 5 hints. Hints don't refill passively — buy Hint Packs in the Store using USDC, USDT, or USDm. The first hint costs -30 pts, the second -60, and a third fully reveals the puzzle for 0 points."
  },
  {
    question: "How are points calculated?",
    answer: "Earned PTS = max(0, floor((Base − Hint Penalty) × Streak Multiplier) + Speed Bonus). Base is 100 for a standard puzzle and 200 for the Daily Challenge. Streak multiplier grows +10% per consecutive solve day up to 1.5×. Solve in ≤15 seconds with 0 hints for a +25 speed bonus."
  },
  {
    question: "How many puzzles can I solve per day?",
    answer: "You get 3 free Classic puzzles per UTC day. Paying $0.01 USDT unlocks unlimited Classic puzzles for the rest of that day. The Daily Challenge is one shared puzzle per UTC day."
  },
  {
    question: "What is a streak?",
    answer: "A streak counts consecutive UTC days you've solved at least one puzzle. Longer streaks boost your points multiplier (up to 1.5× at 5 days). If you miss a day, your streak resets back to 1. You'll get a notification if this happens."},
  {
    question: "What is a Streak Freeze?",
    answer: "A Streak Freeze protects your streak if you miss a day. When you skip a day and have a freeze available, it's consumed automatically and your streak is preserved. New accounts start with 1 free streak freeze. Buy more in the Store under Streak Freezes using USDC, USDT, or USDm."
  },
  {
    question: "How does the leaderboard work?",
    answer: "Rankings run in weekly seasons (Monday 00:00 UTC). Your rank score = season points (this week's total) + streak bonus (max +100). Compete against others in your league. Climb from ♟ Pawn → ♞ Knight (750 lifetime pts + 7-day streak) → ♚ King (1,800 lifetime pts + 14-day streak). League membership is based on lifetime progress and doesn't reset between seasons."
  },
  {
    question: "What are levels and the progress map?",
    answer: "Your total lifetime points map to a level: L = floor(sqrt(points/100)) + 1. Each level is a node on the winding home map; every 5th level is a chest milestone. Solve puzzles to advance your token along the path."
  },
  {
    question: "Can I analyze a puzzle after solving it?",
    answer: "Yes! After completing a puzzle, you can close the completion modal and use the ← and → buttons to navigate through all the moves. This helps you understand the solution better."
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="h-dvh w-full app-paper-bg text-black flex flex-col overflow-hidden">
      {/* Header */}
      <header className="pt-4 px-4 flex justify-between items-center shrink-0">
        <Link
          href="/"
          className="bg-black text-white px-2 py-1 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all"
        >
          ← BACK
        </Link>
        <div className="px-4 py-2 font-black text-sm border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-yellow-400 text-black">
          <span className="inline-flex items-center gap-1">
            <CircleHelp className="w-4 h-4" /> FAQ
          </span>
        </div>
      </header>
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col items-center px-4 py-6 gap-4">
        {/* Title Card */}
        <div className="w-full max-w-2xl bg-cyan-400 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 transform -rotate-1">
          <h1 className="font-black text-2xl text-black">FREQUENTLY ASKED QUESTIONS</h1>
          <p className="font-bold text-black/70 mt-1">Everything you need to know about Chess Puzzles</p>
        </div>

        {/* FAQ Accordion */}
        <div className="w-full max-w-2xl space-y-3">
          {faqItems.map((item, index) => (
            <div
              key={index}
              className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className={`w-full px-4 py-3 flex items-center justify-between font-black text-left transition-colors ${
                  openIndex === index ? "bg-purple-400" : "bg-white hover:bg-gray-100"
                }`}
              >
                <span className="text-black pr-4">{item.question}</span>
                <span className="text-2xl text-black shrink-0">
                  {openIndex === index ? "−" : "+"}
                </span>
              </button>
              {openIndex === index && (
                <div className="px-4 py-3 bg-purple-100 border-t-4 border-black">
                  <p className="font-bold text-black/80 leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Card */}
        <div className="w-full max-w-2xl bg-green-400 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 transform rotate-1 mt-4">
          <h2 className="font-black text-lg text-black mb-2">STILL HAVE QUESTIONS?</h2>
          <p className="font-bold text-black/80">
            Can&apos;t find what you&apos;re looking for? Join our Telegram community for support and discussions!
          </p>
          <a
            href="https://t.me/+qffqunjhX3c4OGVk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 bg-black text-white px-4 py-2 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all"
          >
            <Smartphone className="w-4 h-4" /> JOIN TELEGRAM
          </a>
        </div>

        {/* Quick Links */}
        <div className="w-full max-w-2xl flex flex-wrap gap-3 justify-center mt-2">
          <Link
            href="/solve-puzzles"
            className="bg-yellow-400 text-black px-4 py-2 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all inline-flex items-center gap-2"
          >
            <Puzzle className="w-4 h-4" /> START SOLVING
          </Link>
          <Link
            href="/leaderboard"
            className="bg-purple-400 text-black px-4 py-2 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all inline-flex items-center gap-2"
          >
            <Trophy className="w-4 h-4" /> LEADERBOARD
          </Link>
          <Link
            href="/settings"
            className="bg-gray-300 text-black px-4 py-2 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all inline-flex items-center gap-2"
          >
            <Settings className="w-4 h-4" /> SETTINGS
          </Link>
        </div>

        <SiteFooter />
      </main>

      <BottomNav />
    </div>
  );
}
