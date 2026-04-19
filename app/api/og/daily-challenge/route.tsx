import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

import { getDailyChallengeShareData, parseUtcDayInput } from "@/lib/services/daily-challenge-share.service";

export const runtime = "nodejs";

const BOARD_SIZE = 8;

const PIECE_SYMBOLS: Record<string, string> = {
  k: "K",
  q: "Q",
  r: "R",
  b: "B",
  n: "N",
  p: "P",
};

const createEmptyBoard = () =>
  Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => ""));

const parseFenBoard = (fen: string) => {
  const placement = fen.split(" ")[0] || "";
  const ranks = placement.split("/");

  if (ranks.length !== BOARD_SIZE) {
    return createEmptyBoard();
  }

  return ranks.map((rank) => {
    const row: string[] = [];

    for (const char of rank) {
      const emptySquares = Number.parseInt(char, 10);
      if (Number.isInteger(emptySquares) && emptySquares > 0) {
        for (let i = 0; i < emptySquares; i += 1) {
          row.push("");
        }
      } else {
        row.push(char);
      }
    }

    if (row.length < BOARD_SIZE) {
      return [...row, ...Array.from({ length: BOARD_SIZE - row.length }, () => "")];
    }

    return row.slice(0, BOARD_SIZE);
  });
};

const squareColor = (row: number, col: number) => ((row + col) % 2 === 0 ? "#f5deb3" : "#b58863");

const pieceLabel = (piece: string) => {
  if (!piece) {
    return "";
  }

  const mapped = PIECE_SYMBOLS[piece.toLowerCase()] || piece.toUpperCase();
  return piece === piece.toUpperCase() ? mapped : mapped.toLowerCase();
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const utcDay = parseUtcDayInput(searchParams.get("d") || searchParams.get("day"));
    const shareData = await getDailyChallengeShareData(utcDay);

    if (!shareData) {
      return new Response("Daily challenge not found", { status: 404 });
    }

    const board = parseFenBoard(shareData.fen);

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            background: "linear-gradient(135deg, #fff9ec 0%, #ffd86b 100%)",
            color: "#111111",
            padding: "48px",
            gap: "36px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              border: "8px solid #111111",
              backgroundColor: "#ffffff",
              boxShadow: "16px 16px 0 rgba(17,17,17,0.22)",
              padding: "36px 42px",
              width: "100%",
              maxWidth: "660px",
            }}
          >
            <div
              style={{
                fontSize: "28px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "12px",
              }}
            >
              Chess Puzzles Daily Challenge
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "72px",
                fontWeight: 900,
                lineHeight: 1,
                marginBottom: "20px",
              }}
            >
              {`Day ${shareData.dayLabel}`}
            </div>

            <div
              style={{
                display: "flex",
                gap: "18px",
                marginBottom: "18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#22d3ee",
                  border: "4px solid #111111",
                  padding: "10px 16px",
                  fontSize: "28px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                {`Rating ${shareData.rating}`}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#86efac",
                  border: "4px solid #111111",
                  padding: "10px 16px",
                  fontSize: "28px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                {`Reward ${shareData.rewardLabel}`}
              </div>
            </div>

            <div
              style={{
                fontSize: "34px",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Solve it. Claim it. Share it.
            </div>
          </div>

          <div
            style={{
              width: "380px",
              height: "380px",
              display: "flex",
              flexDirection: "column",
              border: "8px solid #111111",
              boxShadow: "12px 12px 0 rgba(17,17,17,0.22)",
              overflow: "hidden",
              backgroundColor: "#fff9ec",
            }}
          >
            {board.map((row, rowIndex) => (
              <div
                key={`row-${rowIndex}`}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  flex: 1,
                }}
              >
                {row.map((piece, colIndex) => {
                  const isWhitePiece = piece !== "" && piece === piece.toUpperCase();
                  return (
                    <div
                      key={`sq-${rowIndex}-${colIndex}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "47.5px",
                        height: "47.5px",
                        backgroundColor: squareColor(rowIndex, colIndex),
                        fontSize: "26px",
                        fontWeight: 900,
                        color: piece ? (isWhitePiece ? "#ffffff" : "#111111") : "transparent",
                        textShadow: isWhitePiece ? "0 1px 0 #111111" : "none",
                      }}
                    >
                      {pieceLabel(piece)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ),
      {
        // Farcaster large preview image dimensions.
        width: 1200,
        height: 630,
      },
    );
  } catch (error: any) {
    return new Response(`Failed to generate image: ${error?.message || "Unknown error"}`, {
      status: 500,
    });
  }
}
