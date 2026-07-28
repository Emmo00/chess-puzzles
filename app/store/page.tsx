"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { WalletConnect } from "@/components/WalletConnect";
import { PaymentModal } from "@/components/PaymentModal";
import {
  Castle,
  Lightbulb,
  Snowflake,
  Gift,
  Palette,
  Store as StoreIcon,
  Loader2,
} from "lucide-react";

interface CatalogItem {
  _id: string;
  name: string;
  description: string;
  category: string;
  priceUsd: string;
  quantity: number;
  active: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  hints: "Hint Packs",
  streak_freeze: "Streak Freezes",
  mystery_box: "Mystery Boxes",
  cosmetic: "Cosmetics",
};

const CATEGORY_ICONS: Record<string, typeof Lightbulb> = {
  hints: Lightbulb,
  streak_freeze: Snowflake,
  mystery_box: Gift,
  cosmetic: Palette,
};

const CATEGORY_ACCENTS: Record<string, string> = {
  hints: "bg-cyan-400",
  streak_freeze: "bg-blue-400",
  mystery_box: "bg-purple-400",
  cosmetic: "bg-pink-400",
};

const CATEGORY_ORDER = ["hints", "streak_freeze", "mystery_box", "cosmetic"];

export default function StorePage() {
  const { isConnected } = useAccount();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [accessConfig, setAccessConfig] = useState<{ unlockAmountUsd: string } | null>(null);
  const [showDailyAccess, setShowDailyAccess] = useState(false);

  useEffect(() => {
    window.fetch("/api/admin/store-items")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setItems((data || []).filter((it: CatalogItem) => it.active)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
    window.fetch("/api/config/public")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setAccessConfig(data))
      .catch(() => {});
  }, []);

  const handleBuy = (item: CatalogItem) => {
    if (!isConnected) {
      toast.error("Connect your wallet to purchase.");
      return;
    }
    setSelectedItem(item);
    setShowPayment(true);
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    setSelectedItem(null);
    toast.success("Purchase complete!", {
      description: `${selectedItem?.name} — perks granted to your wallet.`,
    });
  };

  const handleBuyDailyAccess = () => {
    if (!isConnected) {
      toast.error("Connect your wallet to purchase.");
      return;
    }
    setShowDailyAccess(true);
  };

  const grouped = CATEGORY_ORDER
    .map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      items: items.filter((it) => it.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="h-dvh w-full app-paper-bg text-black flex flex-col overflow-hidden">
      <header className="pt-4 px-4 flex justify-between items-center shrink-0 gap-2">
        <div className="px-3 py-2 font-black text-sm border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-lime-400 text-black inline-flex items-center gap-1">
          <StoreIcon className="w-4 h-4" /> STORE
        </div>
        <WalletConnect />
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-6 max-w-md w-full mx-auto">
        <div className="bg-yellow-300 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 text-xs font-bold uppercase">
          Hints & Streak Freezes never expire.
        </div>

        {/* Daily Pass — unlimited puzzles for a day */}
        {accessConfig && (
          <div className="bg-orange-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 flex items-center gap-3">
            <div className="grid place-items-center w-10 h-10 border-2 border-black bg-white shrink-0">
              <Castle className="w-5 h-5" strokeWidth={3} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm uppercase truncate">Daily Pass</div>
              <div className="text-xs font-bold text-black/70 truncate">
                Unlimited puzzles for the rest of the day
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-black text-sm">${accessConfig.unlockAmountUsd}</div>
              <button
                type="button"
                onClick={handleBuyDailyAccess}
                className="mt-1 bg-black text-white px-2 py-1 text-[10px] font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                Buy
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2 text-sm font-black uppercase">Loading catalog...</span>
          </div>
        ) : grouped.length === 0 ? (
          <div className="bg-white border-4 border-black p-6 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="font-black text-lg uppercase">No items available</div>
            <div className="text-xs font-bold text-black/70 mt-1">Check back soon!</div>
          </div>
        ) : (
          grouped.map((group) => {
            const Icon = CATEGORY_ICONS[group.category] || Gift;
            const accent = CATEGORY_ACCENTS[group.category] || "bg-white";
            return (
              <section key={group.category} className="space-y-2">
                <h2 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                  <span className="inline-block w-2 h-4 bg-black" />
                  {group.label}
                </h2>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <div
                      key={item._id}
                      className={`${accent} border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 flex items-center gap-3`}
                    >
                      <div className="grid place-items-center w-10 h-10 border-2 border-black bg-white shrink-0">
                        <Icon className="w-5 h-5" strokeWidth={3} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-sm uppercase truncate">{item.name}</div>
                        <div className="text-xs font-bold text-black/70 truncate">
                          {item.description || `×${item.quantity}`}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-sm">${item.priceUsd}</div>
                        <button
                          type="button"
                          onClick={() => handleBuy(item)}
                          className="mt-1 bg-black text-white px-2 py-1 text-[10px] font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                          Buy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>

      <BottomNav />

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={handlePaymentSuccess}
        storeItem={selectedItem}
      />

      {accessConfig && (
        <PaymentModal
          isOpen={showDailyAccess}
          onClose={() => setShowDailyAccess(false)}
          onSuccess={() => {
            setShowDailyAccess(false);
            toast.success("Daily pass purchased! Unlimited puzzles for the rest of the day.");
          }}
          defaultPriceUsd={accessConfig.unlockAmountUsd}
        />
      )}
    </div>
  );
}
