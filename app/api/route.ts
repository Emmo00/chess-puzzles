import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Chess-O-Clock API",
    version: "1.0.0",
    endpoints: {
      authentication: "/api/users/me",
      puzzles: {
        daily: "/api/puzzles/daily",
        solve: "/api/puzzles/solve",
        todayCount: "/api/puzzles/today/me"
      },
      leaderboard: {
        points: "/api/leaderboard/points",
        solved: "/api/leaderboard/solved"
      }
    }
  });
}