export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Chess-O-Clock
        </h1>
        <div className="text-center">
          <h2 className="text-2xl mb-4">Chess Puzzle API</h2>
          <p className="mb-4">
            A Next.js API for chess puzzles with Farcaster authentication.
          </p>
          <div className="bg-gray-100 p-4 rounded-lg text-left">
            <h3 className="font-bold mb-2">Available API Endpoints:</h3>
            <ul className="space-y-1">
              <li><code>/api/users/me</code> - Get authenticated user</li>
              <li><code>/api/puzzles/daily</code> - Get daily puzzle</li>
              <li><code>/api/puzzles/solve</code> - Submit puzzle solution</li>
              <li><code>/api/puzzles/today/me</code> - Get today&apos;s puzzle count</li>
              <li><code>/api/leaderboard/points</code> - Points leaderboard</li>
              <li><code>/api/leaderboard/solved</code> - Solved puzzles leaderboard</li>
            </ul>
          </div>
          <div className="mt-6">
            <a 
              href="/docs" 
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              View Full Documentation
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}