import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rating = searchParams.get("rating") || "?";
    const reward = searchParams.get("reward") || "0 TOKEN";
    const day = searchParams.get("day") || new Date().toISOString().slice(0, 10);

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "linear-gradient(135deg, #fff9ec 0%, #ffd86b 100%)",
            color: "#111111",
            padding: "48px",
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
              maxWidth: "980px",
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
              Day {day}
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
                Rating {rating}
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
                Reward {reward}
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
        </div>
      ),
      {
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
