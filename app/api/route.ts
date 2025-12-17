import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Chess-O-Clock API",
    version: "1.0.0",
    endpoints: {
      authentication: "/api/users/me",
      puzzles: {
        daily: { get: "/api/puzzles/daily", solve: "/api/puzzles/daily/solve" },
        solve: {
          new: "/api/puzzles/solve/new",
          status: "/api/puzzles/solve/status",
          solve: "/api/puzzles/solve",
        },
        todayCount: "/api/puzzles/today/me",
      },
      leaderboard: "/api/leaderboard",
    },
  });
}
