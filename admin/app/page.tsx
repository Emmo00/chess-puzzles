"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Navigation } from "@/components/Navigation";
import { DashboardContent } from "@/components/DashboardContent";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const { isConnected } = useAccount();

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        setAuthenticated(true);
      } else {
        window.location.href = "/login";
      }
    } catch {
      window.location.href = "/login";
    }
  };

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Navigation>
      <DashboardContent />
    </Navigation>
  );
}
