"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { WalletConnect } from "@/components/WalletConnect";
import { SiteFooter } from "@/components/SiteFooter";
import { PaymentModal } from "@/components/PaymentModal";
import { Castle, Lightbulb, Snowflake, Store as StoreIcon, Loader2, Check } from "lucide-react";
import { useHintBalance } from "@/lib/hooks/useHintBalance";
import { GAME_ASSETS_CONTRACT, GAME_ASSET_TYPES } from "@/lib/config/wagmi";
import { GAME_ASSETS_ABI } from "@/lib/abi/gameAssets";

interface StoreItem {
  id: string;
  name: string;
  category: string;
  priceUsd: string;
  quantity: number;
  packId?: number;
}

interface ContractPack {
  id: number;
  name: string;
  assetType: string;
  quantity: bigint;
  price: bigint;
  active: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  hints: "Hints",
  streak_freeze: "Streak Freezes",
};

const CATEGORY_ICONS: Record<string, typeof Lightbulb> = {
  hints: Lightbulb,
  streak_freeze: Snowflake,
};

const CATEGORY_ACCENTS: Record<string, string> = {
  hints: "bg-cyan-400",
  streak_freeze: "bg-blue-400",
};

export default function StorePage() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [dailyPassPrice, setDailyPassPrice] = useState<string | null>(null);
  const [showDailyAccess, setShowDailyAccess] = useState(false);
  const [hasDailyAccess, setHasDailyAccess] = useState(false);

  const { hintBalance, streakFreezes } = useHintBalance();
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();

  useEffect(() => {
    loadCatalog();
    checkDailyPassStatus();
  }, [publicClient, address, isConnected]);

  const loadCatalog = async () => {
    if (!GAME_ASSETS_CONTRACT || !publicClient) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [hintUnit, freezeUnit, count] = await Promise.all([
        publicClient.readContract({
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "unitPrices",
          args: [GAME_ASSET_TYPES.HINT],
        }),
        publicClient.readContract({
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "unitPrices",
          args: [GAME_ASSET_TYPES.STREAK_FREEZE],
        }),
        publicClient.readContract({
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "getAssetPackCount",
        }),
      ]);

      const loaded: StoreItem[] = [];

      // Individual items first (when unit price is set)
      if (Number(hintUnit) > 0) {
        loaded.push({
          id: "hint-unit",
          name: "1 Hint",
          category: "hints",
          priceUsd: (Number(hintUnit) / 1_000_000).toFixed(2),
          quantity: 1,
        });
      }
      if (Number(freezeUnit) > 0) {
        loaded.push({
          id: "freeze-unit",
          name: "1 Streak Freeze",
          category: "streak_freeze",
          priceUsd: (Number(freezeUnit) / 1_000_000).toFixed(2),
          quantity: 1,
        });
      }

      // Packs after
      for (let i = 0; i < Number(count); i++) {
        const pack = await publicClient.readContract({
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "getAssetPack",
          args: [BigInt(i)],
        }) as ContractPack;
        if (pack.active) {
          const assetType = pack.assetType.toLowerCase();
          loaded.push({
            id: `pack-${i}`,
            name: pack.name,
            category: assetType === GAME_ASSET_TYPES.HINT.toLowerCase() ? "hints" : "streak_freeze",
            priceUsd: (Number(pack.price) / 1_000_000).toFixed(2),
            quantity: Number(pack.quantity),
            packId: i,
          });
        }
      }

      setItems(loaded);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const checkDailyPassStatus = async () => {
    if (!GAME_ASSETS_CONTRACT || !publicClient) return;
    try {
      const [price, hasActive] = await Promise.all([
        publicClient.readContract({
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "dailyPassPrice",
        }),
        address
          ? publicClient.readContract({
              address: GAME_ASSETS_CONTRACT,
              abi: GAME_ASSETS_ABI,
              functionName: "hasActiveDailyPass",
              args: [address as `0x${string}`],
            })
          : false,
      ]);
      setDailyPassPrice((Number(price) / 1_000_000).toFixed(2));
      setHasDailyAccess(hasActive as boolean);
    } catch { /* ignore */ }
  };

  const handleBuy = (item: StoreItem) => {
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
    loadCatalog();
    checkDailyPassStatus();
    toast.success("Purchase complete!");
  };

  const handleBuyDailyAccess = () => {
    if (!isConnected) {
      toast.error("Connect your wallet to purchase.");
      return;
    }
    setShowDailyAccess(true);
  };

  const hintItems = items.filter((i) => i.category === "hints");
  const freezeItems = items.filter((i) => i.category === "streak_freeze");
  const hasItems = items.length > 0;

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
        {dailyPassPrice && (
          <div
            className={`${hasDailyAccess ? "bg-lime-300" : "bg-orange-400"} border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 flex items-center gap-3`}
          >
            <div className="grid place-items-center w-10 h-10 border-2 border-black bg-white shrink-0">
              <Castle className="w-5 h-5" strokeWidth={3} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm uppercase truncate">Daily Pass</div>
              <div className="text-xs font-bold text-black/70 truncate">
                {hasDailyAccess ? "Active — unlimited puzzles today" : "Unlimited puzzles for the rest of the day"}
              </div>
            </div>
            <div className="text-right shrink-0">
              {hasDailyAccess ? (
                <div className="flex items-center gap-1 mt-1 bg-black text-lime-300 px-2 py-1 text-[10px] font-black uppercase border-2 border-black">
                  <Check className="w-3 h-3" /> Owned
                </div>
              ) : (
                <>
                  <div className="font-black text-sm">${dailyPassPrice}</div>
                  <button
                    type="button"
                    onClick={handleBuyDailyAccess}
                    className="mt-1 bg-black text-white px-2 py-1 text-[10px] font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    Buy
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2 text-sm font-black uppercase">Loading catalog...</span>
          </div>
        ) : !hasItems && !dailyPassPrice ? (
          <div className="bg-white border-4 border-black p-6 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="font-black text-lg uppercase">No items available</div>
            <div className="text-xs font-bold text-black/70 mt-1">Check back soon!</div>
          </div>
        ) : (
          <>
            {hintItems.length > 0 && (
              <section className="space-y-2">
                <h2 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                  <span className="inline-block w-2 h-4 bg-black" />
                  <span className="inline-flex items-center justify-between gap-1 w-full">
                    <span>Hints</span>
                    <span>[You have {hintBalance}]</span>
                  </span>
                </h2>
                <div className="space-y-2">
                  {hintItems.map((item) => (
                    <div key={item.id} className="bg-cyan-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 flex items-center gap-3">
                      <div className="grid place-items-center w-10 h-10 border-2 border-black bg-white shrink-0">
                        <Lightbulb className="w-5 h-5" strokeWidth={3} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-sm uppercase truncate">{item.name}</div>
                        <div className="text-xs font-bold text-black/70 truncate">×{item.quantity}</div>
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
            )}

            {freezeItems.length > 0 && (
              <section className="space-y-2">
                <h2 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                  <span className="inline-block w-2 h-4 bg-black" />
                  <span className="inline-flex items-center justify-between gap-1 w-full">
                    <span>Streak Freezes</span>
                    <span>[You have {streakFreezes}]</span>
                  </span>
                </h2>
                <div className="space-y-2">
                  {freezeItems.map((item) => (
                    <div key={item.id} className="bg-blue-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 flex items-center gap-3">
                      <div className="grid place-items-center w-10 h-10 border-2 border-black bg-white shrink-0">
                        <Snowflake className="w-5 h-5" strokeWidth={3} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-sm uppercase truncate">{item.name}</div>
                        <div className="text-xs font-bold text-black/70 truncate">×{item.quantity}</div>
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
            )}
          </>
        )}

        <SiteFooter />
      </main>

      <BottomNav />

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={handlePaymentSuccess}
        storeItem={selectedItem ? {
          name: selectedItem.name,
          category: selectedItem.category,
          priceUsd: selectedItem.priceUsd,
          quantity: selectedItem.quantity,
          packId: selectedItem.packId,
        } : null}
      />

      {dailyPassPrice && (
        <PaymentModal
          isOpen={showDailyAccess}
          onClose={() => setShowDailyAccess(false)}
          onSuccess={() => {
            setShowDailyAccess(false);
            checkDailyPassStatus();
            toast.success("Daily pass purchased! Unlimited puzzles for the rest of the day.");
          }}
          defaultPriceUsd={dailyPassPrice}
        />
      )}
    </div>
  );
}