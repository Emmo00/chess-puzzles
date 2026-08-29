"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Activity,
  Puzzle,
  Trophy,
  CreditCard,
  AlertTriangle,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  dau: number;
  wau: number;
  puzzlesSolvedToday: number;
  puzzlesSolvedWeek: number;
  puzzleRushSessionsToday: number;
  puzzleRushAvgScore: number;
  paymentVolume: { symbol: string; total: number }[];
  recentErrors: any[];
}

export function DashboardContent() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats?.totalUsers ?? 0}
          color="bg-blue-500"
        />
        <StatCard
          icon={Activity}
          label="DAU / WAU"
          value={`${stats?.dau ?? 0} / ${stats?.wau ?? 0}`}
          color="bg-green-500"
        />
        <StatCard
          icon={Puzzle}
          label="Puzzles Solved (Today)"
          value={stats?.puzzlesSolvedToday ?? 0}
          color="bg-purple-500"
        />
        <StatCard
          icon={Trophy}
          label="Puzzle Rush Sessions (Today)"
          value={stats?.puzzleRushSessionsToday ?? 0}
          color="bg-orange-500"
        />
      </div>

      {/* Payment Volume */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Volume
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats?.paymentVolume?.map((item) => (
            <div key={item.symbol} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">{item.symbol}</p>
              <p className="text-xl font-bold text-gray-900">
                ${item.total.toLocaleString()}
              </p>
            </div>
          ))}
          {(!stats?.paymentVolume || stats.paymentVolume.length === 0) && (
            <p className="text-sm text-gray-500">No payment data available</p>
          )}
        </div>
      </div>

      {/* Recent Errors */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Recent Errors
        </h2>
        {stats?.recentErrors?.length ? (
          <div className="space-y-3">
            {stats.recentErrors.slice(0, 5).map((error, i) => (
              <div
                key={i}
                className="p-3 bg-red-50 rounded-lg border border-red-200"
              >
                <p className="text-sm font-medium text-red-800">
                  {error.message}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {error.path} • {new Date(error.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No recent errors</p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
