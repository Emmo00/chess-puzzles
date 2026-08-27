"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { apiFetch, initApi } from "@/lib/api";

// Patch global fetch to prefix API routes with backend URL
initApi();

export function UserInit() {
  const { address, isConnected } = useAccount();
  const initialised = useRef(false);

  useEffect(() => {
    if (!isConnected || !address) {
      initialised.current = false;
      return;
    }
    if (initialised.current) return;
    initialised.current = true;

    apiFetch("/api/users/init", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${address}`,
      },
    }).catch(() => {});
  }, [address, isConnected]);

  return null;
}