"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { useAccount } from "wagmi";
import { detectPlatform } from "@/lib/utils/errorReporting";
import {
  getLastDevError,
  toJsonSafe,
} from "@/lib/utils/devStore";

const FEEDBACK_BOT_URL =
  process.env.NEXT_PUBLIC_FEEDBACK_BOT_URL || "https://t.me/ChessPuzzlesFeedbackBot";
const COMMUNITY_LINK = "https://t.me/+qffqunjhX3c4OGVk";

const MAX_SECTION_CHARS = 12_000;

const truncateSection = (value: unknown, maxChars: number): string => {
  const json = JSON.stringify(toJsonSafe(value)) ?? String(value);
  if (json.length <= maxChars) return json;
  return `${json.slice(0, maxChars)}\n...[truncated]`;
};

export function TelegramSupportLink() {
  const { address } = useAccount();
  const [submitting, setSubmitting] = useState(false);

  const lastError =
    typeof window !== "undefined" ? getLastDevError() : undefined;

  const openCommunity = () => {
    window.open(COMMUNITY_LINK, "_blank", "noopener,noreferrer");
  };

  const handleClick = async () => {
    if (submitting) return;

    if (!lastError) {
      openCommunity();
      return;
    }

    setSubmitting(true);
    try {
      const report = {
        action: lastError.action,
        message: lastError.message,
        stack: lastError.stack,
        platform: detectPlatform(),
        browser: navigator.userAgent,
        userAddress: address,
        path: window.location.href,
        timestamp: lastError.timestamp,
        rawError: truncateSection(lastError.rawError, MAX_SECTION_CHARS),
        rawPayload: truncateSection(lastError.rawPayload, MAX_SECTION_CHARS),
      };

      const response = await fetch("/api/telegram/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });

      if (!response.ok) {
        throw new Error("Failed to create report");
      }

      const data = await response.json();
      const reportId = data?.reportId;

      if (typeof reportId === "string" && reportId.length > 0) {
        window.open(
          `${FEEDBACK_BOT_URL}?start=${encodeURIComponent(reportId)}`,
          "_blank",
          "noopener,noreferrer"
        );
        return;
      }

      throw new Error("No report id returned");
    } catch (error) {
      console.error("Failed to submit bug report", error);
      openCommunity();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-black/10">
      <button
        onClick={() => void handleClick()}
        disabled={submitting}
        className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-black hover:text-blue-600 transition-colors group disabled:opacity-60 disabled:cursor-wait cursor-pointer"
      >
        <Send className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        {submitting ? "Preparing report..." : "Report issue on Telegram"}
      </button>
    </div>
  );
}
