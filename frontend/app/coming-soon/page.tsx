'use client'

import Link from 'next/link'
import { Construction, Hammer, Puzzle } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'

export default function ComingSoonPage() {
  return (
    <div className="h-dvh w-full app-paper-bg flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto relative">
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-red-500 border-4 border-black transform rotate-45 shadow-[8px_8px_0px_rgba(0,0,0,1)]"></div>
          <div className="absolute top-20 right-20 w-24 h-24 bg-blue-500 border-4 border-black transform -rotate-12 shadow-[6px_6px_0px_rgba(0,0,0,1)]"></div>
          <div className="absolute bottom-20 left-20 w-28 h-28 bg-green-500 border-4 border-black transform rotate-12 shadow-[7px_7px_0px_rgba(0,0,0,1)]"></div>
          <div className="absolute bottom-10 right-10 w-20 h-20 bg-purple-500 border-4 border-black transform rotate-45 shadow-[5px_5px_0px_rgba(0,0,0,1)]"></div>
        </div>

        <div className="relative max-w-lg w-full text-center space-y-8 z-10 mx-auto py-10 px-4">
          {/* Main Icon */}
          <div className="flex justify-center">
            <div className="bg-orange-400 border-8 border-black p-8 transform -rotate-3 shadow-[12px_12px_0px_rgba(0,0,0,1)]">
              <Construction className="w-20 h-20 animate-bounce" />
            </div>
          </div>

          {/* Title Section */}
          <div className="space-y-6">
            <div className="bg-black border-4 border-white p-4 transform rotate-2 shadow-[8px_8px_0px_rgba(255,255,255,1)]">
              <h1 className="text-5xl font-black text-yellow-300 uppercase tracking-wider">
                COMING
              </h1>
            </div>
            <div className="bg-pink-500 border-4 border-black p-4 transform -rotate-1 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
              <h2 className="text-5xl font-black text-black uppercase tracking-wider">
                SOON!
              </h2>
            </div>
          </div>

          {/* Description Cards */}
          <div className="space-y-4">
            <div className="bg-cyan-400 border-4 border-black p-4 transform rotate-1 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <p className="font-black text-black uppercase tracking-wide text-sm inline-flex items-center gap-2">
                <Hammer className="w-4 h-4" /> This Feature is Under Construction!
              </p>
            </div>
            <div className="bg-lime-400 border-4 border-black p-4 transform -rotate-2 shadow-[5px_5px_0px_rgba(0,0,0,1)]">
              <p className="font-black text-black uppercase tracking-wide text-sm inline-flex items-center gap-2">
                <Puzzle className="w-4 h-4" /> Keep Solving Puzzles While You Wait!
              </p>
            </div>
          </div>

          {/* Back Button */}
          <div className="pt-6">
            <Link
              href="/"
              className="inline-block"
            >
              <div className="bg-red-500 border-4 border-black px-8 py-4 font-black text-xl uppercase tracking-wider text-black shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_rgba(0,0,0,1)] hover:transform hover:-translate-x-1 hover:-translate-y-1 transition-all duration-150 transform rotate-1 hover:rotate-0">
                ← BACK TO HOME
              </div>
            </Link>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}