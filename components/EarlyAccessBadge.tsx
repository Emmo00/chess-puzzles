"use client";

interface EarlyAccessBadgeProps {
  visible: boolean;
  slotsRemaining: number;
}

export function EarlyAccessBadge({ visible, slotsRemaining }: EarlyAccessBadgeProps) {
  if (!visible) return null;

  return (
    <div className="px-3 py-2 border-4 border-black bg-yellow-300 shadow-[4px_4px_0px_rgba(0,0,0,1)] transform -rotate-1 animate-[slideInDown_0.35s_cubic-bezier(0.34,1.56,0.64,1)]">
      <p className="text-[10px] font-black uppercase tracking-wide text-black">Early Check-in</p>
      <p className="text-xs font-black text-black">{slotsRemaining} slots left</p>
    </div>
  );
}
