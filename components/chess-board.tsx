"use client";

import { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { Chess, Square } from "chess.js";
import { Chessboard, SquareDataType, SquareHandlerArgs } from "react-chessboard";
import { Puzzle } from "../lib/types";

interface ChessBoardProps {
  puzzle?: Puzzle;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
  onWrongMove?: () => void;
  onMoveIndexChange?: (moveIndex: number) => void;
  onTurnChange?: (turn: 'w' | 'b') => void;
  onWrongMoveStateChange?: (isWrongMove: boolean) => void;
  onHistoryChange?: (canGoBack: boolean, canGoForward: boolean) => void;
  highlightedSquares?: { from?: string; to?: string } | null;
}

export interface ChessBoardRef {
  getNextMove: () => { from: string; to: string } | null;
  goBack: () => void;
  goForward: () => void;
  undoWrongMove: () => void;
  isAtLatestPosition: () => boolean;
}

const ChessBoard = forwardRef<ChessBoardRef, ChessBoardProps>(({ puzzle, onComplete, onProgress, onWrongMove, onMoveIndexChange, onTurnChange, onWrongMoveStateChange, onHistoryChange, highlightedSquares }, ref) => {
  const [mounted, setMounted] = useState(false);
  const [game, setGame] = useState<Chess | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [boardPosition, setBoardPosition] = useState<string>("");
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const [moveFrom, setMoveFrom] = useState<string>("");
  const [wrongMoveSquares, setWrongMoveSquares] = useState<Record<string, React.CSSProperties>>({});
  const [isWrongMoveActive, setIsWrongMoveActive] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  
  // Move history for back/forward navigation
  const [moveHistory, setMoveHistory] = useState<{ fen: string; moveIndex: number }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

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

      // Initialize history with starting position
      const initialHistory = [{ fen: chess.fen(), moveIndex: -1 }];
      setMoveHistory(initialHistory);
      setHistoryIndex(0);

      // Set initial position to show the FEN state
      setBoardPosition(chess.fen());
      setGame(chess);
      setCurrentMoveIndex(-1); // -1 means we haven't applied the first move yet
      setIsPlayerTurn(false);
      setIsWrongMoveActive(false);
      setWrongMoveSquares({});

      // After a timeout, apply the first move (opponent's move) to show the puzzle position
      const timeoutId = setTimeout(() => {
        if (puzzle.moves.length > 0) {
          chess.move(puzzle.moves[0]);
          playMoveSound(true); // Opening move sound
          setBoardPosition(chess.fen());
          setCurrentMoveIndex(0);
          setIsPlayerTurn(true); // Now it's player's turn
          
          // Add to history
          const newHistory = [...initialHistory, { fen: chess.fen(), moveIndex: 0 }];
          setMoveHistory(newHistory);
          setHistoryIndex(1);
        }
      }, 1000); // 1 second delay to show animation
      
      return () => clearTimeout(timeoutId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle?.puzzleid]);
  
  // Notify parent about state changes via separate effects
  useEffect(() => {
    onProgress?.(0);
  }, [puzzle?.puzzleid]);
  
  useEffect(() => {
    if (game) {
      onTurnChange?.(game.turn());
    }
  }, [game, onTurnChange]);
  
  useEffect(() => {
    onMoveIndexChange?.(currentMoveIndex);
  }, [currentMoveIndex, onMoveIndexChange]);
  
  useEffect(() => {
    const canBack = historyIndex > 0;
    const canForward = historyIndex < moveHistory.length - 1;
    onHistoryChange?.(canBack, canForward);
  }, [historyIndex, moveHistory.length, onHistoryChange]);
  
  useEffect(() => {
    onWrongMoveStateChange?.(isWrongMoveActive);
  }, [isWrongMoveActive, onWrongMoveStateChange]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    // Get the next expected move (from and to squares for hint highlighting)
    getNextMove: () => {
      if (!puzzle || currentMoveIndex < 0) return null;
      const nextMoveIndex = currentMoveIndex + 1;
      if (nextMoveIndex >= puzzle.moves.length) return null;
      const nextMove = puzzle.moves[nextMoveIndex];
      // Move format is like "d1d3" or "e7e8q" - first 2 chars are "from", next 2 are "to"
      return {
        from: nextMove.substring(0, 2),
        to: nextMove.substring(2, 4),
      };
    },
    // Navigate back in history
    goBack: () => {
      if (historyIndex <= 0 || moveHistory.length === 0) return;
      
      const newIndex = historyIndex - 1;
      const historyEntry = moveHistory[newIndex];
      
      const chess = new Chess(historyEntry.fen);
      setGame(chess);
      setBoardPosition(historyEntry.fen);
      setHistoryIndex(newIndex);
      setCurrentMoveIndex(historyEntry.moveIndex);
      
      // Clear any wrong move state when navigating
      setWrongMoveSquares({});
      setIsWrongMoveActive(false);
    },
    // Navigate forward in history
    goForward: () => {
      if (historyIndex >= moveHistory.length - 1) return;
      
      const newIndex = historyIndex + 1;
      const historyEntry = moveHistory[newIndex];
      
      const chess = new Chess(historyEntry.fen);
      setGame(chess);
      setBoardPosition(historyEntry.fen);
      setHistoryIndex(newIndex);
      setCurrentMoveIndex(historyEntry.moveIndex);
    },
    // Undo wrong move (for retry)
    undoWrongMove: () => {
      if (!isWrongMoveActive || moveHistory.length < 2) return;
      
      // Go back to the position before the wrong move
      const newHistory = moveHistory.slice(0, -1);
      const lastEntry = newHistory[newHistory.length - 1];
      
      const chess = new Chess(lastEntry.fen);
      setGame(chess);
      setBoardPosition(lastEntry.fen);
      setMoveHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setCurrentMoveIndex(lastEntry.moveIndex);
      
      // Clear wrong move state
      setWrongMoveSquares({});
      setIsWrongMoveActive(false);
      setIsPlayerTurn(true);
    },
    // Check if currently at the latest position
    isAtLatestPosition: () => {
      return historyIndex === moveHistory.length - 1;
    },
  }), [puzzle, currentMoveIndex, moveHistory, historyIndex, isWrongMoveActive]);

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
    
    // Don't allow moves if not at latest position or if wrong move is active
    if (historyIndex !== moveHistory.length - 1 || isWrongMoveActive) return false;

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
            setIsPlayerTurn(false);
            
            // Add to history
            const newHistory = [...moveHistory, { fen: gameCopy.fen(), moveIndex: newMoveIndex }];
            setMoveHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);

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
                  const opponentMoveIndex = newMoveIndex + 1;
                  setCurrentMoveIndex(opponentMoveIndex);
                  setIsPlayerTurn(true);
                  
                  // Add opponent move to history
                  const historyWithOpponent = [...newHistory, { fen: gameCopy.fen(), moveIndex: opponentMoveIndex }];
                  setMoveHistory(historyWithOpponent);
                  setHistoryIndex(historyWithOpponent.length - 1);
                }
              }, 1000);
            }

            return true;
          } else {
            // Wrong move! Keep the position and show retry button
            playMoveSound(false);
            setWrongMoveSquares({
              [sourceSquare]: { background: "rgba(255, 0, 0, 0.7)" },
              [targetSquare]: { background: "rgba(255, 0, 0, 0.7)" }
            });
            
            // Show the wrong move and keep it
            setGame(gameCopy);
            setBoardPosition(gameCopy.fen());
            setIsPlayerTurn(false); // Disable further moves
            setIsWrongMoveActive(true);
            
            // Add wrong move to history so it can be undone
            const newHistory = [...moveHistory, { fen: gameCopy.fen(), moveIndex: currentMoveIndex }];
            setMoveHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
            
            // Notify parent about wrong move
            onWrongMove?.();
            
            return true;
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
    
    // Don't allow moves if not at latest position or if wrong move is active
    if (historyIndex !== moveHistory.length - 1 || isWrongMoveActive) return;

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
            setIsPlayerTurn(false);
            
            // Add to history
            const newHistory = [...moveHistory, { fen: gameCopy.fen(), moveIndex: newMoveIndex }];
            setMoveHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
            
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
                  const opponentMoveIndex = newMoveIndex + 1;
                  setCurrentMoveIndex(opponentMoveIndex);
                  setIsPlayerTurn(true);
                  
                  // Add opponent move to history
                  const historyWithOpponent = [...newHistory, { fen: gameCopy.fen(), moveIndex: opponentMoveIndex }];
                  setMoveHistory(historyWithOpponent);
                  setHistoryIndex(historyWithOpponent.length - 1);
                }
              }, 1000);
            }
          } else {
            // Wrong move! Keep the position and show retry button
            playMoveSound(false);
            setWrongMoveSquares({
              [moveFrom]: { background: "rgba(255, 0, 0, 0.7)" },
              [square]: { background: "rgba(255, 0, 0, 0.7)" }
            });
            
            // Show the wrong move and keep it
            setGame(gameCopy);
            setBoardPosition(gameCopy.fen());
            setIsPlayerTurn(false); // Disable further moves
            setIsWrongMoveActive(true);
            
            // Add wrong move to history so it can be undone
            const newHistory = [...moveHistory, { fen: gameCopy.fen(), moveIndex: currentMoveIndex }];
            setMoveHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
            
            // Notify parent about wrong move
            onWrongMove?.();
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

  // Build highlight styles for hint (supports both from and to squares)
  const hintSquareStyles: Record<string, React.CSSProperties> = {};
  if (highlightedSquares?.from) {
    hintSquareStyles[highlightedSquares.from] = {
      background: "rgba(255, 200, 0, 0.7)",
      boxShadow: "inset 0 0 0 4px rgba(255, 150, 0, 1)",
    };
  }
  if (highlightedSquares?.to) {
    hintSquareStyles[highlightedSquares.to] = {
      background: "rgba(100, 200, 100, 0.7)",
      boxShadow: "inset 0 0 0 4px rgba(50, 150, 50, 1)",
    };
  }

  return (
    <div className={`inline-block border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${isWrongMoveActive ? 'animate-pulse' : ''}`}>
      <div 
        style={{ width: "320px", height: "320px" }}
      >
        <Chessboard
          options={{
            position: boardPosition,
            onSquareClick,
            allowDragging: false,
            boardOrientation: "white",
            animationDurationInMs: 500,
            boardStyle: {
              borderRadius: "0px",
            },
            squareStyles: { ...optionSquares, ...wrongMoveSquares, ...hintSquareStyles },
            lightSquareStyle: { backgroundColor: "#EEEED2" },
            darkSquareStyle: { backgroundColor: "#739552" },
            id: "click-to-move",
          }}
        />
      </div>
    </div>
  );
});

ChessBoard.displayName = "ChessBoard";

export default ChessBoard;
