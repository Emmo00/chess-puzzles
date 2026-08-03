"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Send } from "lucide-react";
import {
  getLastDevError,
  safeStringify,
  subscribeDevErrors,
} from "@/lib/utils/devStore";

const MAX_MESSAGE_CHARS = 3500;

export function TelegramSupportLink() {
  const lastError = useSyncExternalStore(subscribeDevErrors, getLastDevError);

  const href = useMemo(() => {
    const appUrl =
      typeof window !== "undefined"
        ? window.location.href
        : "https://chesspuzzles.xyz";

    const lines: string[] = ["Chess Puzzles - error report", ""];

    if (lastError) {
      lines.push(`Action: ${lastError.action}`);
      lines.push(`Message: ${lastError.message}`);
      lines.push(`Time: ${new Date(lastError.timestamp).toLocaleString()}`);

      if (lastError.rawPayload !== undefined) {
        lines.push("", "RAW PAYLOAD:", safeStringify(lastError.rawPayload));
      }
      if (lastError.rawError !== undefined) {
        lines.push("", "RAW ERROR:", safeStringify(lastError.rawError));
      }
    } else {
      lines.push("Please include details of the issue you encountered.");
    }

    lines.push("", `App URL: ${appUrl}`);

    let message = lines.join("\n");
    if (message.length > MAX_MESSAGE_CHARS) {
      message = `${message.slice(0, MAX_MESSAGE_CHARS)}\n...[truncated]`;
    }

    const url = new URL("https://t.me/share/url");
    url.searchParams.set("url", appUrl);
    url.searchParams.set("text", message);
    return url.toString();
  }, [lastError]);

  return (
    <div className="mt-3 pt-3 border-t border-black/10">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-black hover:text-blue-600 transition-colors group"
      >
        <Send className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        Report issue on Telegram
      </a>
    </div>
  );
}
