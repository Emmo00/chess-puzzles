"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { usePathname } from "next/navigation";
import { reportFrontendError } from "@/lib/utils/errorReporting";

export function GlobalErrorListener() {
  const { address } = useAccount();
  const pathname = usePathname();

  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      reportFrontendError({
        message: event.message || "Unknown error",
        stack: event.error?.stack,
        userAddress: address,
        path: pathname,
        action: "Unhandled window error",
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      let message = "Unhandled Promise Rejection";
      let stack = undefined;

      if (event.reason instanceof Error) {
        message = event.reason.message;
        stack = event.reason.stack;
      } else if (typeof event.reason === "string") {
        message = event.reason;
      } else {
        message = JSON.stringify(event.reason);
      }

      reportFrontendError({
        message,
        stack,
        userAddress: address,
        path: pathname,
        action: "Unhandled promise rejection",
      });
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [address, pathname]);

  return null;
}
