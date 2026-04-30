"use client";

import { Send } from "lucide-react";

export function TelegramSupportLink() {
  return (
    <div className="mt-3 pt-3 border-t border-black/10">
      <a
        href="https://t.me/+qffqunjhX3c4OGVk"
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
