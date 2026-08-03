"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { usePathname } from "next/navigation";
import { reportFrontendError } from "@/lib/utils/errorReporting";
import { captureDevError } from "@/lib/utils/devStore";

const EXTERNAL_STACK_PATTERNS = [
  /chrome-extension:\/\//i,
  /moz-extension:\/\//i,
  /edge-extension:\/\//i,
  /safari-web-extension:\/\//i,
  /user-script/i,
];

const isExternalScriptError = (stack?: string): boolean => {
  if (!stack) return false;
  return EXTERNAL_STACK_PATTERNS.some((pattern) => pattern.test(stack));
};

export function GlobalErrorListener() {
  const { address } = useAccount();
  const pathname = usePathname();

  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      const stack = event.error?.stack;
      if (isExternalScriptError(stack)) return;

reportFrontendError({
        message: event.message || "Unknown error",
        stack: event.error?.stack,
        userAddress: address,
        path: pathname,
        action: "Unhandled window error",
      });
      captureDevError({
        message: event.message || "Unknown error",
        action: "Unhandled window error",
        error: event.error,
        payload: { path: pathname, userAddress: address },
        source: "window",
        report: false,
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

      if (isExternalScriptError(stack)) return;

      reportFrontendError({
        message,
        stack,
        userAddress: address,
        path: pathname,
        action: "Unhandled promise rejection",
      });
      captureDevError({
        message,
        action: "Unhandled promise rejection",
        error: event.reason,
        payload: { path: pathname, userAddress: address },
        source: "unhandledrejection",
        report: false,
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
