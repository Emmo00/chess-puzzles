import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

const FALLBACK_APP_URL = "https://chesspuzzles.xyz";

const BOARD_SIZE = 8;

const PIECE_SYMBOLS: Record<string, string> = {
  K: "\u2654",
  Q: "\u2655",
  R: "\u2656",
  B: "\u2657",
  N: "\u2658",
  P: "\u2659",
  k: "\u265A",
  q: "\u265B",
  r: "\u265C",
  b: "\u265D",
  n: "\u265E",
  p: "\u265F",
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

  return PIECE_SYMBOLS[piece] || "";
};

type ShareData = {
  utcDay: number;
  dayLabel: string;
  rating: number;
  rewardLabel: string;
  fen: string;
  puzzleId: string;
  themes: string[];
};

const fetchShareData = async (d: string): Promise<ShareData | null> => {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || FALLBACK_APP_URL;
    const res = await fetch(`${apiBase}/checkin/share?d=${encodeURIComponent(d)}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const d = searchParams.get("d") || searchParams.get("day") || "";
    const shareData = d ? await fetchShareData(d) : null;

    if (!shareData) {
      return new Response("Daily challenge not found", { status: 404 });
    }

    const board = parseFenBoard(shareData.fen);

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "800px",
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
              maxWidth: "640px",
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
              Solve it. Claim it.
            </div>
          </div>

          <div
            style={{
              width: "410px",
              height: "410px",
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
                        width: "51.25px",
                        height: "51.25px",
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
        // 3:2 preview image dimensions (within 600x400 to 3000x2000).
        width: 1200,
        height: 800,
      },
    );
  } catch (error: any) {
    return new Response(`Failed to generate image: ${error?.message || "Unknown error"}`, {
      status: 500,
    });
  }
}
