"use client";

import { useEffect, useState } from "react";
import { Chess, Square } from "chess.js";
import { Chessboard, SquareDataType, SquareHandlerArgs } from "react-chessboard";
import { Puzzle } from "../lib/types";

interface ChessBoardProps {
  puzzle?: Puzzle;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
  onWrongMove?: () => void;
  onMoveIndexChange?: (moveIndex: number) => void;
}

export default function ChessBoard({ puzzle, onComplete, onProgress, onWrongMove, onMoveIndexChange }: ChessBoardProps) {
  const [mounted, setMounted] = useState(false);
  const [game, setGame] = useState<Chess | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [boardPosition, setBoardPosition] = useState<string>("");
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const [moveFrom, setMoveFrom] = useState<string>("");
  const [wrongMoveSquares, setWrongMoveSquares] = useState<Record<string, React.CSSProperties>>({});
  const [isAnimatingWrongMove, setIsAnimatingWrongMove] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize audio context on first user interaction
  const initAudioContext = () => {
    if (!audioContext && typeof window !== 'undefined') {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioContext(ctx);
        
        // Resume context if it's suspended (required by browser policies)
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        
        return ctx;
      } catch (error) {
        console.warn('Could not create AudioContext:', error);
        return null;
      }
    }
    return audioContext;
  };

  // Audio effects for moves
  const playMoveSound = (isCorrect: boolean = true) => {
    try {
      const ctx = initAudioContext();
      if (!ctx) return;
      
      if (isCorrect) {
        // Correct move sound - pleasant tone
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
      } else {
        // Wrong move sound - buzzer-like tone
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.type = 'sawtooth';
        
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
      }
    } catch (error) {
      console.warn('Could not play move sound:', error);
    }
  };

  useEffect(() => {
    if (puzzle) {
      const chess = new Chess();

      // Load the FEN position (before opponent's move)
      chess.load(puzzle.fen);

      // Set initial position to show the FEN state
      setBoardPosition(chess.fen());
      setGame(chess);
      setCurrentMoveIndex(-1); // -1 means we haven't applied the first move yet
      setIsPlayerTurn(false);
      onProgress?.(0);

      // After a timeout, apply the first move (opponent's move) to show the puzzle position
      setTimeout(() => {
        if (puzzle.moves.length > 0) {
          chess.move(puzzle.moves[0]);
          playMoveSound(true); // Opening move sound
          setBoardPosition(chess.fen());
          setCurrentMoveIndex(0);
          onMoveIndexChange?.(0);
          setIsPlayerTurn(true); // Now it's player's turn
        }
      }, 1000); // 1 second delay to show animation
    }
  }, [puzzle, onProgress]);

  const onPieceDrop = ({
    piece,
    sourceSquare,
    targetSquare,
  }: {
    piece: any;
    sourceSquare: string;
    targetSquare: string | null;
  }) => {
    if (!game || !puzzle || !isPlayerTurn || !targetSquare) return false;

    const gameCopy = new Chess(game.fen());

    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q", // Default to queen promotion
      });

      if (move) {
        // Check if this is the correct next move
        const expectedMoveIndex = currentMoveIndex + 1;

        if (expectedMoveIndex < puzzle.moves.length) {
          const expectedMove = puzzle.moves[expectedMoveIndex];
          const madeMove = move.from + move.to + (move.promotion || "");

          if (madeMove === expectedMove) {
            // Correct move!
            playMoveSound(true);
            setGame(gameCopy);
            setBoardPosition(gameCopy.fen());
            const newMoveIndex = currentMoveIndex + 1;
            setCurrentMoveIndex(newMoveIndex);
            onMoveIndexChange?.(newMoveIndex);
            setIsPlayerTurn(false);

            // Update progress - count only player moves (odd indices after the first move)
            const totalPlayerMoves = Math.ceil((puzzle.moves.length - 1) / 2);
            const playerMovesCompleted = Math.floor(newMoveIndex / 2);
            onProgress?.(Math.min(playerMovesCompleted, totalPlayerMoves));

            // Check if puzzle is complete
            if (newMoveIndex >= puzzle.moves.length - 1) {
              setTimeout(() => {
                onComplete?.();
              }, 500);
            } else {
              // Apply opponent's response after a delay
              setTimeout(() => {
                if (newMoveIndex + 1 < puzzle.moves.length) {
                  const nextMove = puzzle.moves[newMoveIndex + 1];
                  gameCopy.move(nextMove);
                  playMoveSound(true); // Opponent move sound
                  setGame(gameCopy);
                  setBoardPosition(gameCopy.fen());
                  setCurrentMoveIndex(newMoveIndex + 1);
                  onMoveIndexChange?.(newMoveIndex + 1);
                  setIsPlayerTurn(true);
                }
              }, 1000);
            }

            return true;
          } else {
            // Wrong move! Show animation and revert
            playMoveSound(false);
            setIsAnimatingWrongMove(true);
            setWrongMoveSquares({
              [sourceSquare]: { background: "rgba(255, 0, 0, 0.7)" },
              [targetSquare]: { background: "rgba(255, 0, 0, 0.7)" }
            });
            
            // Temporarily show the wrong move
            setGame(gameCopy);
            setBoardPosition(gameCopy.fen());
            
            // Increase attempt count
            onWrongMove?.();
            
            setTimeout(() => {
              // Revert to previous position
              setGame(game);
              setBoardPosition(game.fen());
              setWrongMoveSquares({});
              setIsAnimatingWrongMove(false);
            }, 800);
            
            return true; // Allow the move temporarily for animation
          }
        }
      }
    } catch (error) {
      // Invalid move
      return false;
    }

    return false;
  };

  // get the move options for a square to show valid moves
  function getMoveOptions(square: Square) {
    if (!game) return false;

    // get the moves for the square
    const moves = game.moves({
      square,
      verbose: true,
    });

    // if no moves, clear the option squares
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    // create a new object to store the option squares
    const newSquares: Record<string, React.CSSProperties> = {};

    // loop through the moves and set the option squares
    for (const move of moves) {
      newSquares[move.to] = {
        background:
          game.get(move.to) && game.get(move.to)?.color !== game.get(square)?.color
            ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)" // larger circle for capturing
            : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        // smaller circle for moving
        borderRadius: "50%",
      };
    }

    // set the square clicked to move from to yellow
    newSquares[square] = {
      background: "rgba(255, 255, 0, 0.4)",
    };

    // set the option squares
    setOptionSquares(newSquares);

    // return true to indicate that there are move options
    return true;
  }

  function onSquareClick({ square, piece }: SquareHandlerArgs) {
    if (!game || !puzzle) return;

    // Initialize audio on first click (user gesture required)
    initAudioContext();

    // piece clicked to move
    if (!moveFrom && piece) {
      // get the move options for the square
      const hasMoveOptions = getMoveOptions(square as Square);

      // if move options, set the moveFrom to the square
      if (hasMoveOptions) {
        setMoveFrom(square);
      }

      // return early
      return;
    }

    // square clicked to move to, check if valid move
    const moves = game.moves({
      square: moveFrom as Square,
      verbose: true,
    });
    const foundMove = moves.find((m) => m.from === moveFrom && m.to === square);

    // not a valid move
    if (!foundMove) {
      // check if clicked on new piece
      const hasMoveOptions = getMoveOptions(square as Square);

      // if new piece, setMoveFrom, otherwise clear moveFrom
      setMoveFrom(hasMoveOptions ? square : "");

      // return early
      return;
    }

    // Check if it's a valid puzzle move first
    if (!isPlayerTurn) {
      setMoveFrom("");
      setOptionSquares({});
      return;
    }

    // Create a copy to test the move
    const gameCopy = new Chess(game.fen());
    
    try {
      const move = gameCopy.move({
        from: moveFrom,
        to: square,
        promotion: "q",
      });

      if (move) {
        // Check if this is the correct next move in the puzzle
        const expectedMoveIndex = currentMoveIndex + 1;
        
        if (expectedMoveIndex < puzzle.moves.length) {
          const expectedMove = puzzle.moves[expectedMoveIndex];
          const madeMove = move.from + move.to + (move.promotion || "");
          
          if (madeMove === expectedMove) {
            // Correct move!
            playMoveSound(true);
            setGame(gameCopy);
            setBoardPosition(gameCopy.fen());
            const newMoveIndex = currentMoveIndex + 1;
            setCurrentMoveIndex(newMoveIndex);
            onMoveIndexChange?.(newMoveIndex);
            setIsPlayerTurn(false);
            
            // Update progress
            const totalPlayerMoves = Math.ceil((puzzle.moves.length - 1) / 2);
            const playerMovesCompleted = Math.floor(newMoveIndex / 2);
            onProgress?.(Math.min(playerMovesCompleted, totalPlayerMoves));
            
            // Check if puzzle is complete
            if (newMoveIndex >= puzzle.moves.length - 1) {
              setTimeout(() => {
                onComplete?.();
              }, 500);
            } else {
              // Apply opponent's response after a delay
              setTimeout(() => {
                if (newMoveIndex + 1 < puzzle.moves.length) {
                  const nextMove = puzzle.moves[newMoveIndex + 1];
                  gameCopy.move(nextMove);
                  playMoveSound(true); // Opponent move sound
                  setGame(gameCopy);
                  setBoardPosition(gameCopy.fen());
                  setCurrentMoveIndex(newMoveIndex + 1);
                  onMoveIndexChange?.(newMoveIndex + 1);
                  setIsPlayerTurn(true);
                }
              }, 1000);
            }
          } else {
            // Wrong move! Show animation and revert
            playMoveSound(false);
            setIsAnimatingWrongMove(true);
            setWrongMoveSquares({
              [moveFrom]: { background: "rgba(255, 0, 0, 0.7)" },
              [square]: { background: "rgba(255, 0, 0, 0.7)" }
            });
            
            // Temporarily show the wrong move
            setGame(gameCopy);
            setBoardPosition(gameCopy.fen());
            
            // Increase attempt count
            onWrongMove?.();
            
            setTimeout(() => {
              // Revert to previous position
              setGame(game);
              setBoardPosition(game.fen());
              setWrongMoveSquares({});
              setIsAnimatingWrongMove(false);
            }, 800);
          }
        }
      }
    } catch (error) {
      // Invalid move - check if clicked on new piece
      const hasMoveOptions = getMoveOptions(square as Square);
      setMoveFrom(hasMoveOptions ? square : "");
      return;
    }

    // clear moveFrom and optionSquares
    setMoveFrom("");
    setOptionSquares({});
  }

  if (!mounted) return null;

  return (
    <div className={`inline-block border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${isAnimatingWrongMove ? 'animate-pulse' : ''}`}>
      <div 
        style={{ width: "320px", height: "320px" }}
        className={isAnimatingWrongMove ? 'animate-bounce' : ''}
      >
        <Chessboard
          options={{
            position: boardPosition,
            onSquareClick,
            allowDragging: false,
            boardOrientation: "white",
            animationDurationInMs: isAnimatingWrongMove ? 200 : 500,
            boardStyle: {
              borderRadius: "0px",
            },
            squareStyles: { ...optionSquares, ...wrongMoveSquares },
            lightSquareStyle: { backgroundColor: "#EEEED2" },
            darkSquareStyle: { backgroundColor: "#739552" },
            id: "click-to-move",
          }}
        />
      </div>
    </div>
  );
}
