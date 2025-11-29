'use client'

import Link from 'next/link'
import { ArrowLeft, Clock, Wrench } from 'lucide-react'

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-purple-500/30">
              <Wrench className="w-12 h-12 text-purple-400" />
            </div>
            <div className="absolute -top-2 -right-2">
              <Clock className="w-8 h-8 text-yellow-400 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white">
            Coming Soon
          </h1>
          <p className="text-lg text-gray-300">
            We're working hard to bring you this feature
          </p>
        </div>

        {/* Description */}
        <div className="space-y-4 text-gray-400">
          <p>
            This feature is currently under development. 
          </p>
          <p>
            In the meantime, enjoy solving daily chess puzzles to improve your skills!
          </p>
        </div>

        {/* Back Button */}
        <div className="pt-4">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        {/* Progress Indicator */}
        <div className="pt-8">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-purple-500/50 rounded-full animate-pulse delay-100"></div>
            <div className="w-2 h-2 bg-purple-500/30 rounded-full animate-pulse delay-200"></div>
            <span className="ml-2">Building something awesome...</span>
          </div>
        </div>
      </div>
    </div>
  )
}