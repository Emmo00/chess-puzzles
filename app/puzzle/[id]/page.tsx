import { Metadata } from 'next'

interface Props {
  params: { id: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const puzzleId = params.id

  return {
    title: `Chess Puzzle #${puzzleId} - Master Your Tactics`,
    description: `Solve challenging chess puzzle #${puzzleId} and improve your tactical skills`,
    openGraph: {
      title: `Chess Puzzle #${puzzleId}`,
      description: "Can you solve this chess tactic?",
      images: [
        {
          url: `/api/og?title=Puzzle%20${puzzleId}&subtitle=Solve%20This%20Chess%20Tactic`,
          width: 1200,
          height: 630,
          alt: `Chess Puzzle #${puzzleId}`
        }
      ],
      type: "website"
    }
  }
}

export default function PuzzlePage({ params }: Props) {
  const puzzleId = params.id
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Chess Puzzle #{puzzleId}</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Solve This Position</h2>
          <div className="w-full aspect-square bg-gray-700 rounded-lg flex items-center justify-center">
            <div className="text-6xl">♔♛♜♝♞♟</div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Instructions</h3>
          <p className="text-gray-300 mb-4">
            Find the best move for White in this position. Look for tactical patterns like pins, forks, and discovered attacks.
          </p>
          
          <div className="flex gap-4">
            <button className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold">
              Show Hint
            </button>
            <button className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-semibold">
              Submit Solution
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}