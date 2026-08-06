import Link from "next/link";
import { Send } from "lucide-react";

const COMMUNITY_LINK = "https://t.me/+qffqunjhX3c4OGVk";

export function SiteFooter() {
  return (
    <footer className="w-full px-4 pt-6 pb-2 text-center shrink-0">
      <div className="flex items-center justify-center gap-2.5">
        <Link
          href="/terms-of-service"
          className="text-[11px] font-bold uppercase tracking-wide text-black/50 hover:text-black/80 transition-colors"
        >
          Terms
        </Link>
        <span aria-hidden="true" className="text-black/30">·</span>
        <Link
          href="/privacy-policy"
          className="text-[11px] font-bold uppercase tracking-wide text-black/50 hover:text-black/80 transition-colors"
        >
          Privacy
        </Link>
        <span aria-hidden="true" className="text-black/30">·</span>
        <a
          href={COMMUNITY_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-black/50 hover:text-black/80 transition-colors"
        >
          <Send className="w-3 h-3" /> Support
        </a>
      </div>
      <p className="mt-1 text-[10px] font-bold text-black/40">
        Not operated by Opera or MiniPay.
      </p>
    </footer>
  );
}