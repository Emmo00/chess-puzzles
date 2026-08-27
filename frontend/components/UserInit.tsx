"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";

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

    fetch("/api/users/init", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${address}`,
      },
    }).catch(() => {});
  }, [address, isConnected]);

  return null;
}