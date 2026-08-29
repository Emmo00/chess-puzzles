import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { dbConnect } from "@workspace/db";
import { User, Payment, PuzzleRushSession, FrontendError, UserPuzzle } from "@workspace/db";

export async function GET(req: NextRequest) {
  try {
    // Verify admin session
    const token = req.cookies.get("admin_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifySession(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    // Total users
    const totalUsers = await User.countDocuments();

    // DAU (users active today)
    const dau = await User.countDocuments({
      lastPuzzleDate: { $gte: todayStart.toISOString().split("T")[0] },
    });

    // WAU (users active this week)
    const wau = await User.countDocuments({
      lastPuzzleDate: { $gte: weekStart.toISOString().split("T")[0] },
    });

    // Puzzles solved today — aggregate from UserPuzzle, not from Users.totalPuzzlesSolved
    const puzzlesSolvedToday = await UserPuzzle.aggregate([
      {
        $match: {
          completed: true,
          solvedAt: { $gte: todayStart },
        },
      },
      {
        $count: "total",
      },
    ]);

    // Puzzles solved this week
    const puzzlesSolvedWeek = await UserPuzzle.aggregate([
      {
        $match: {
          completed: true,
          solvedAt: { $gte: weekStart },
        },
      },
      {
        $count: "total",
      },
    ]);

    // Puzzle Rush sessions today
    const puzzleRushToday = await PuzzleRushSession.aggregate([
      {
        $match: {
          startTime: { $gte: todayStart },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgScore: { $avg: "$score" },
        },
      },
    ]);

    // Payment volume by stablecoin
    const paymentVolume = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: weekStart },
          verified: true,
        },
      },
      {
        $group: {
          _id: "$paymentType",
          total: { $sum: { $toDouble: "$amount" } },
        },
      },
    ]);

    // Recent errors
    const recentErrors = await FrontendError.find({ status: "new" })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      totalUsers,
      dau,
      wau,
      puzzlesSolvedToday: puzzlesSolvedToday[0]?.total ?? 0,
      puzzlesSolvedWeek: puzzlesSolvedWeek[0]?.total ?? 0,
      puzzleRushSessionsToday: puzzleRushToday[0]?.count ?? 0,
      puzzleRushAvgScore: Math.round(puzzleRushToday[0]?.avgScore ?? 0),
      paymentVolume: paymentVolume.map((p) => ({
        symbol: p._id,
        total: Math.round(p.total * 100) / 100,
      })),
      recentErrors,
    });
  } catch (error: any) {
    console.error("Stats fetch failed:", error.message);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
