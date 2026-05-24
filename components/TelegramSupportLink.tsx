"use client";

import { Send } from "lucide-react";

export function TelegramSupportLink() {
  return (
    <div className="mt-3 pt-3 border-t-2 border-black">
      <a
        href="https://t.me/+qffqunjhX3c4OGVk"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-black bg-yellow-300 border-2 border-black px-3 py-2 shadow-[3px_3px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all group"
      >
        <Send className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        Report issue on Telegram
      </a>
    </div>
  );
}
