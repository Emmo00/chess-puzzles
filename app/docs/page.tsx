'use client'

import { useEffect, useState } from 'react'

export default function DocsPage() {
  const [apiInfo, setApiInfo] = useState<any>(null)

  useEffect(() => {
    fetch('/api')
      .then(res => res.json())
      .then(data => setApiInfo(data))
      .catch(console.error)
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Chess-O-Clock API Documentation</h1>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Overview</h2>
          <p className="text-gray-700 mb-4">
            Chess-O-Clock is a chess puzzle API that integrates with Farcaster for user authentication.
            Users can fetch daily puzzles, solve them, and compete on leaderboards.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Authentication</h2>
          <p className="text-gray-700 mb-2">
            All API endpoints require authentication via Farcaster QuickAuth JWT tokens.
          </p>
          <div className="bg-gray-100 p-4 rounded-lg">
            <code>Authorization: Bearer &lt;jwt_token&gt;</code>
          </div>
        </section>

        {apiInfo && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">API Endpoints</h2>
            
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold">Authentication</h3>
                <p className="text-sm text-gray-600 mb-2">Get or create authenticated user</p>
                <div className="bg-blue-50 p-2 rounded">
                  <code>GET {apiInfo.endpoints.authentication}</code>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold">Daily Puzzle</h3>
                <p className="text-sm text-gray-600 mb-2">Fetch a new daily puzzle (max 3 per day)</p>
                <div className="bg-green-50 p-2 rounded">
                  <code>POST {apiInfo.endpoints.puzzles.daily}</code>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold">Solve Puzzle</h3>
                <p className="text-sm text-gray-600 mb-2">Submit a puzzle solution</p>
                <div className="bg-green-50 p-2 rounded">
                  <code>POST {apiInfo.endpoints.puzzles.solve}</code>
                </div>
                <div className="mt-2 text-sm">
                  <strong>Body:</strong> <code>{JSON.stringify({ puzzleId: "string", attempts: "number" })}</code>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold">Today&apos;s Puzzle Count</h3>
                <p className="text-sm text-gray-600 mb-2">Get number of puzzles fetched today</p>
                <div className="bg-blue-50 p-2 rounded">
                  <code>GET {apiInfo.endpoints.puzzles.todayCount}</code>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold">Points Leaderboard</h3>
                <p className="text-sm text-gray-600 mb-2">Get leaderboard ranked by points</p>
                <div className="bg-blue-50 p-2 rounded">
                  <code>GET {apiInfo.endpoints.leaderboard.points}?page=1&limit=10&filter=global</code>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold">Solved Puzzles Leaderboard</h3>
                <p className="text-sm text-gray-600 mb-2">Get leaderboard ranked by puzzles solved</p>
                <div className="bg-blue-50 p-2 rounded">
                  <code>GET {apiInfo.endpoints.leaderboard.solved}?page=1&limit=10&filter=global</code>
                </div>
              </div>
            </div>
          </section>
        )}

        <section>
          <h2 className="text-2xl font-semibold mb-4">Environment Variables</h2>
          <div className="space-y-2">
            <div className="bg-gray-100 p-2 rounded">
              <code>MONGO_CONNECTION_URL</code> - MongoDB connection string
            </div>
            <div className="bg-gray-100 p-2 rounded">
              <code>PUZZLE_API_URL</code> - Chess puzzle API endpoint
            </div>
            <div className="bg-gray-100 p-2 rounded">
              <code>PUZZLE_API_KEY</code> - Chess puzzle API key
            </div>
            <div className="bg-gray-100 p-2 rounded">
              <code>HOSTNAME</code> - Application hostname for JWT validation
            </div>
            <div className="bg-gray-100 p-2 rounded">
              <code>NEYNAR_API_KEY</code> - Neynar API key for Farcaster data
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}