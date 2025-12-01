"use client"

import { useEffect, useState } from "react"
import { Chess } from "chess.js"
import { Chessboard, ChessboardProvider } from "react-chessboard"
import { Puzzle } from "../lib/types"

interface ChessBoardProps {
  puzzle?: Puzzle
  onComplete?: () => void
  onProgress?: (progress: number) => void
}

export default function ChessBoard({ puzzle, onComplete, onProgress }: ChessBoardProps) {
  const [mounted, setMounted] = useState(false)
  const [game, setGame] = useState<Chess | null>(null)
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0)
  const [boardPosition, setBoardPosition] = useState<string>("")
  const [isPlayerTurn, setIsPlayerTurn] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (puzzle) {
      const chess = new Chess()
      
      // Load the FEN position (before opponent's move)
      chess.load(puzzle.fen)
      
      // Set initial position to show the FEN state
      setBoardPosition(chess.fen())
      setGame(chess)
      setCurrentMoveIndex(-1) // -1 means we haven't applied the first move yet
      setIsPlayerTurn(false)
      onProgress?.(0)
      
      // After a timeout, apply the first move (opponent's move) to show the puzzle position
      setTimeout(() => {
        if (puzzle.moves.length > 0) {
          chess.move(puzzle.moves[0])
          setBoardPosition(chess.fen())
          setCurrentMoveIndex(0)
          setIsPlayerTurn(true) // Now it's player's turn
        }
      }, 1000) // 1 second delay to show animation
    }
  }, [puzzle, onProgress])

  const handlePieceDrop = ({ piece, sourceSquare, targetSquare }: { piece: any, sourceSquare: string, targetSquare: string | null }) => {
    if (!game || !puzzle || !isPlayerTurn || !targetSquare) return false

    const gameCopy = new Chess(game.fen())
    
    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Default to queen promotion
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
            setBoardPosition(gameCopy.fen())
            const newMoveIndex = currentMoveIndex + 1
            setCurrentMoveIndex(newMoveIndex)
            setIsPlayerTurn(false)
            
            // Update progress - count only player moves (odd indices after the first move)
            const totalPlayerMoves = Math.ceil((puzzle.moves.length - 1) / 2)
            const playerMovesCompleted = Math.floor((newMoveIndex) / 2)
            onProgress?.(Math.min(playerMovesCompleted, totalPlayerMoves))
            
            // Check if puzzle is complete
            if (newMoveIndex >= puzzle.moves.length - 1) {
              setTimeout(() => {
                onComplete?.()
              }, 500)
            } else {
              // Apply opponent's response after a delay
              setTimeout(() => {
                if (newMoveIndex + 1 < puzzle.moves.length) {
                  const nextMove = puzzle.moves[newMoveIndex + 1]
                  gameCopy.move(nextMove)
                  setGame(gameCopy)
                  setBoardPosition(gameCopy.fen())
                  setCurrentMoveIndex(newMoveIndex + 1)
                  setIsPlayerTurn(true)
                }
              }, 1000)
            }
            
            return true
          }
        }
      }
    } catch (error) {
      // Invalid move
      return false
    }
    
    return false
  }

  const canDragPiece = ({ piece }: { piece: any, isSparePiece: boolean, square: string | null }) => {
    // Only allow white pieces to be dragged and only when it's player's turn
    return isPlayerTurn && piece.pieceType?.charAt(0) === 'w'
  }

  if (!mounted) return null

  const chessboardOptions = {
    position: boardPosition,
    onPieceDrop: handlePieceDrop,
    canDragPiece: canDragPiece,
    boardOrientation: "white" as const,
    animationDurationInMs: 300,
    boardStyle: {
      borderRadius: "0px",
    },
    lightSquareStyle: { backgroundColor: "#EEEED2" },
    darkSquareStyle: { backgroundColor: "#739552" },
  }

  return (
    <div className="inline-block border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div style={{ width: "320px", height: "320px" }}>
        <ChessboardProvider options={chessboardOptions}>
          <Chessboard />
        </ChessboardProvider>
      </div>
    </div>
  )
}
