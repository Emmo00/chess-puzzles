"use client";

import { useState } from "react";
import Link from "next/link";

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
    answer: "Don't worry! If you make a wrong move, the board will highlight it in red. Click the RETRY button to undo your move and try again. Each mistake reduces your points slightly, but you can keep trying until you solve the puzzle."
  },
  {
    question: "How do hints work?",
    answer: "Hints are revealed in two stages. First click shows you which piece to move (highlighted in yellow). Second click shows you where to move it (highlighted in green). Using hints reduces your points: 1 hint = 50% points, 2 hints = 25% points, 3+ hints = 0 points."
  },
  {
    question: "How are points calculated?",
    answer: "Points depend on puzzle difficulty (rating) and your performance. Base points: Easy (10), Medium (25), Hard (50), Expert (100). Multipliers are applied for mistakes (1 mistake = 80%, 2+ = 60%) and hints (see above). Both multipliers stack!"
  },
  {
    question: "How many puzzles can I solve per day?",
    answer: "You can solve up to 5 puzzles per day. Your puzzle count resets at midnight UTC. Come back daily to keep your streak alive and climb the leaderboard!"
  },
  {
    question: "What is a streak?",
    answer: "A streak counts consecutive days you've solved at least one puzzle. Maintaining a streak shows your dedication! If you miss a day, your streak resets to zero. Check your current streak on the home page."
  },
  {
    question: "How does the leaderboard work?",
    answer: "Players are ranked primarily by total puzzles solved, with total points as a tiebreaker. Solve more puzzles and solve them accurately to climb higher! The leaderboard shows all-time stats."
  },
  {
    question: "Can I analyze a puzzle after solving it?",
    answer: "Yes! After completing a puzzle, you can close the completion modal and use the ← and → buttons to navigate through all the moves. This helps you understand the solution better."
  },
  {
    question: "What do the puzzle ratings mean?",
    answer: "Puzzle ratings indicate difficulty: Under 1000 (Easy), 1000-1400 (Medium), 1400-1800 (Hard), 1800+ (Expert). Higher-rated puzzles give more points but are more challenging!"
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen w-full bg-white text-black flex flex-col">
      {/* Header */}
      <header className="pt-4 px-4 flex justify-between items-center shrink-0">
        <Link
          href="/"
          className="bg-black text-white px-2 py-1 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all"
        >
          ← BACK
        </Link>
        <div className="px-4 py-2 font-black text-sm border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-yellow-400 text-black">
          ❓ FAQ
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 py-6 gap-4">
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
            className="inline-block mt-3 bg-black text-white px-4 py-2 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all"
          >
            📱 JOIN TELEGRAM
          </a>
        </div>

        {/* Quick Links */}
        <div className="w-full max-w-2xl flex flex-wrap gap-3 justify-center mt-2">
          <Link
            href="/solve-puzzles"
            className="bg-yellow-400 text-black px-4 py-2 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all"
          >
            🧩 START SOLVING
          </Link>
          <Link
            href="/leaderboard"
            className="bg-purple-400 text-black px-4 py-2 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all"
          >
            🏆 LEADERBOARD
          </Link>
          <Link
            href="/settings"
            className="bg-gray-300 text-black px-4 py-2 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all"
          >
            ⚙️ SETTINGS
          </Link>
        </div>
      </main>
    </div>
  );
}
