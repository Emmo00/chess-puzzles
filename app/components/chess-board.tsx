"use client"

import { useEffect, useState } from "react"

interface Piece {
  type: string
  color: "white" | "black"
}

export default function ChessBoard() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Simple puzzle setup: position some pieces
  const board: (Piece | null)[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null))

  // Add some pieces for the puzzle
  board[7][4] = { type: "king", color: "white" }
  board[7][3] = { type: "queen", color: "white" }
  board[6][5] = { type: "pawn", color: "white" }
  board[0][4] = { type: "king", color: "black" }
  board[1][3] = { type: "rook", color: "black" }
  board[2][2] = { type: "knight", color: "black" }

  const getPieceSymbol = (piece: Piece) => {
    const symbols: Record<string, Record<string, string>> = {
      white: {
        pawn: "♙",
        knight: "♘",
        bishop: "♗",
        rook: "♖",
        queen: "♕",
        king: "♔",
      },
      black: {
        pawn: "♟",
        knight: "♞",
        bishop: "♝",
        rook: "♜",
        queen: "♛",
        king: "♚",
      },
    }
    return symbols[piece.color][piece.type]
  }

  return (
    <div className="inline-block rounded-lg overflow-hidden shadow-2xl border-4 border-black">
      <div className="grid grid-cols-8 gap-0 bg-white" style={{ aspectRatio: "1" }}>
        {board.map((row, rowIdx) =>
          row.map((piece, colIdx) => {
            const isLight = (rowIdx + colIdx) % 2 === 0
            const bgColor = isLight ? "bg-[#EEEED2]" : "bg-[#739552]"
            const textColor = piece?.color === "black" ? "text-gray-800" : "text-gray-200"

            return (
              <div
                key={`${rowIdx}-${colIdx}`}
                className={`${bgColor} aspect-square flex items-center justify-center text-4xl font-bold cursor-pointer hover:opacity-80 transition-opacity`}
              >
                {piece ? <span className={textColor}>{getPieceSymbol(piece)}</span> : ""}
              </div>
            )
          }),
        )}
      </div>
    </div>
  )
}
