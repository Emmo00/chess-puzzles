"use client"

import { useEffect, useState } from "react"
import { Chess } from "chess.js"
import { Puzzle } from "../lib/types"

interface Piece {
  type: string
  color: "w" | "b"
}

interface ChessBoardProps {
  puzzle?: Puzzle
  onComplete?: () => void
  onProgress?: (progress: number) => void
}

export default function ChessBoard({ puzzle, onComplete, onProgress }: ChessBoardProps) {
  const [mounted, setMounted] = useState(false)
  const [game, setGame] = useState<Chess | null>(null)
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [possibleMoves, setPossibleMoves] = useState<string[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (puzzle) {
      const chess = new Chess()
      
      // Load the FEN position
      chess.load(puzzle.fen)
      
      // Apply the first move (opponent's move) to get the position player sees
      if (puzzle.moves.length > 0) {
        chess.move(puzzle.moves[0])
      }
      
      setGame(chess)
      setCurrentMoveIndex(0)
      onProgress?.(0)
    }
  }, [puzzle, onProgress])

  const handleSquareClick = (square: string) => {
    if (!game || !puzzle) return

    if (selectedSquare) {
      // Try to make a move
      const gameCopy = new Chess(game.fen())
      
      try {
        const move = gameCopy.move({
          from: selectedSquare,
          to: square,
          promotion: 'q'
        })
        
        if (move) {
          // Check if this is the correct next move
          const expectedMoveIndex = currentMoveIndex + 1
          
          if (expectedMoveIndex < puzzle.moves.length) {
            const expectedMove = puzzle.moves[expectedMoveIndex]
            const madeMove = move.from + move.to + (move.promotion || '')
            
            if (madeMove === expectedMove) {
              // Correct move!
              setGame(gameCopy)
              const newMoveIndex = currentMoveIndex + 1
              setCurrentMoveIndex(newMoveIndex)
              
              // Update progress
              const totalPlayerMoves = Math.ceil((puzzle.moves.length - 1) / 2)
              const playerMovesCompleted = Math.floor(newMoveIndex / 2)
              onProgress?.(Math.min(playerMovesCompleted, totalPlayerMoves))
              
              // Check if puzzle is complete
              if (newMoveIndex >= puzzle.moves.length - 1) {
                setTimeout(() => {
                  onComplete?.()
                }, 500)
              } else {
                // Apply opponent's response
                setTimeout(() => {
                  if (newMoveIndex + 1 < puzzle.moves.length) {
                    const nextMove = puzzle.moves[newMoveIndex + 1]
                    gameCopy.move(nextMove)
                    setGame(gameCopy)
                    setCurrentMoveIndex(newMoveIndex + 1)
                  }
                }, 500)
              }
            }
          }
        }
      } catch (error) {
        // Invalid move
      }
      
      setSelectedSquare(null)
      setPossibleMoves([])
    } else {
      // Select a piece
      const piece = game.get(square as any)
      if (piece && piece.color === 'w') { // Only allow white pieces for player
        setSelectedSquare(square)
        const moves = game.moves({ square: square as any, verbose: true })
        setPossibleMoves(moves.map(m => m.to))
      }
    }
  }

  const renderBoard = () => {
    if (!game) {
      // Default position
      const defaultGame = new Chess()
      return renderBoardFromGame(defaultGame)
    }
    return renderBoardFromGame(game)
  }

  const renderBoardFromGame = (chess: Chess) => {
    const board = chess.board()
    const squares = []
    
    for (let rank = 7; rank >= 0; rank--) {
      for (let file = 0; file < 8; file++) {
        const square = String.fromCharCode(97 + file) + (rank + 1)
        const piece = board[rank][file]
        const isLight = (rank + file) % 2 === 0
        const isSelected = selectedSquare === square
        const isPossibleMove = possibleMoves.includes(square)
        
        squares.push(
          <div
            key={square}
            className={`
              aspect-square flex items-center justify-center text-4xl cursor-pointer transition-all
              ${isLight ? "bg-[#EEEED2]" : "bg-[#739552]"}
              ${isSelected ? "!bg-yellow-400" : ""}
              ${isPossibleMove ? "!bg-green-300" : ""}
              hover:opacity-80
            `}
            onClick={() => handleSquareClick(square)}
          >
            {piece && (
              <span className={piece.color === 'w' ? "text-white" : "text-black"}>
                {getPieceSymbol(piece)}
              </span>
            )}
          </div>
        )
      }
    }
    
    return squares
  }

  const getPieceSymbol = (piece: Piece) => {
    const symbols: Record<string, Record<string, string>> = {
      w: {
        p: "♙", r: "♖", n: "♘", b: "♗", q: "♕", k: "♔"
      },
      b: {
        p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚"
      }
    }
    return symbols[piece.color]?.[piece.type] || ""
  }

  if (!mounted) return null

  return (
    <div className="inline-block border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="grid grid-cols-8 gap-0 bg-white" style={{ width: "320px", height: "320px" }}>
        {renderBoard()}
      </div>
    </div>
  )
}
