"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { GAME_ASSETS_CONTRACT, GAME_ASSET_TYPES } from "@/lib/config/wagmi";
import { GAME_ASSETS_ABI } from "@/lib/abi/gameAssets";
import { useGameAssetsAdmin } from "@/lib/hooks/useGameAssets";

/* ---- Scoring Config Admin ---- */

export function ScoringConfigAdmin() {
  const [config, setConfig] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    window.fetch("/api/admin/scoring-config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  const handleChange = (key: string, value: string) => {
    const num = parseFloat(value);
    if (!Number.isNaN(num)) setConfig((prev) => ({ ...prev, [key]: num }));
  };

  const save = async () => {
    setMessage(null);
    try {
      const res = await window.fetch("/api/admin/scoring-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setMessage("Scoring config saved to database.");
      } else {
        const err = await res.json();
        setMessage(err.message);
      }
    } catch (e: any) {
      setMessage(e.message);
    }
  };

  const fields: { key: string; label: string }[] = [
    { key: "basePointsStandard", label: "Base Points (Standard)" },
    { key: "basePointsDaily", label: "Base Points (Daily)" },
    { key: "hintPenalty1", label: "Hint Penalty (1 hint)" },
    { key: "hintPenalty2", label: "Hint Penalty (2 hints)" },
    { key: "hintFailThreshold", label: "Hints to Fail" },
    { key: "streakCap", label: "Streak Multiplier Cap" },
    { key: "streakStep", label: "Streak Step (+/day)" },
    { key: "streakCapAt", label: "Streak Cap At (days)" },
    { key: "speedBonus", label: "Speed Bonus (pts)" },
    { key: "speedBonusThresholdSec", label: "Speed Bonus Threshold (sec)" },
  ];

  if (!Object.keys(config).length) return null;

  return (
    <section className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
      <h2 className="text-xl font-black uppercase text-black">Scoring Config</h2>
      <p className="text-xs font-bold uppercase text-black/80 mt-1">Edit the point-scoring constants. Saved to database.</p>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {fields.map((f) => (
          <label key={f.key} className="block text-xs font-black uppercase text-black">
            {f.label}
            <input
              type="number"
              value={config[f.key] ?? ""}
              onChange={(e) => handleChange(f.key, e.target.value)}
              className="mt-1 w-full border-2 border-black px-3 py-2 text-xs font-bold"
              step="any"
            />
          </label>
        ))}
      </div>
      <button
        onClick={save}
        className="mt-3 bg-black text-cyan-300 py-2 px-6 font-black text-xs uppercase border-2 border-cyan-300"
      >
        Save Scoring Config
      </button>
      {message && (
        <div className="mt-2 bg-yellow-200 border-2 border-black p-2 text-xs font-black uppercase">{message}</div>
      )}
    </section>
  );
}

/* ---- Perk Distribution ---- */

export function PerkDistributionAdmin() {
  const { address } = useAccount();
  const [wallet, setWallet] = useState("");
  const [perk, setPerk] = useState<"hints" | "streakFreezes">("hints");
  const [amount, setAmount] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { grantAsset } = useGameAssetsAdmin();

  const grant = async () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      setMessage("Valid wallet address required");
      return;
    }
    if (!GAME_ASSETS_CONTRACT) {
      setMessage("GameAssets contract not deployed yet");
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const assetType = perk === "hints" ? GAME_ASSET_TYPES.HINT : GAME_ASSET_TYPES.STREAK_FREEZE;
      const hash = await grantAsset(wallet as `0x${string}`, assetType, Math.max(1, Math.floor(amount)));
      setMessage(`Granted ${amount} ${perk === "hints" ? "hint(s)" : "streak freeze(s)"} — TX: ${hash.slice(0, 10)}...`);
    } catch (e: any) {
      setMessage(e?.shortMessage || e?.message || "Transaction failed");
    }
    setPending(false);
  };

  return (
    <section className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
      <h2 className="text-xl font-black uppercase text-black">Grant Perks</h2>
      <p className="text-xs font-bold uppercase text-black/80 mt-1">Manually give hints or streak freezes via smart contract.</p>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <label className="block text-xs font-black uppercase text-black">
          Wallet
          <input
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x..."
            className="mt-1 w-full border-2 border-black px-3 py-2 text-xs font-bold"
          />
        </label>
        <label className="block text-xs font-black uppercase text-black">
          Perk
          <select
            value={perk}
            onChange={(e) => setPerk(e.target.value as any)}
            className="mt-1 w-full border-2 border-black px-3 py-2 text-xs font-bold bg-white"
          >
            <option value="hints">Hints</option>
            <option value="streakFreezes">Streak Freezes</option>
          </select>
        </label>
        <div className="flex gap-2 items-end">
          <label className="block text-xs font-black uppercase text-black flex-1">
            Amount
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 1)}
              className="mt-1 w-full border-2 border-black px-3 py-2 text-xs font-bold"
              min={1}
            />
          </label>
          <button
            onClick={grant}
            disabled={pending}
            className="bg-black text-cyan-300 py-3 px-4 font-black text-xs uppercase border-2 border-cyan-300 disabled:opacity-50"
          >
            {pending ? "..." : "Grant"}
          </button>
        </div>
      </div>
      {message && (
        <div className={`mt-2 border-2 border-black p-2 text-xs font-black uppercase ${message?.startsWith("Granted") ? "bg-green-300" : "bg-yellow-200"}`}>
          {message}
        </div>
      )}
    </section>
  );
}

/* ---- Game Assets Admin ---- */

export function GameAssetsAdmin() {
  const publicClient = usePublicClient();
  const [packs, setPacks] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const { createAssetPack, updateAssetPack, setUnitPrice, setDailyPassPrice, setDailyPassDuration, grantDailyPass } = useGameAssetsAdmin();
  const [grantWallet, setGrantWallet] = useState("");

  const [packName, setPackName] = useState("");
  const [packType, setPackType] = useState<"hints" | "streak_freeze">("hints");
  const [packQty, setPackQty] = useState(1);
  const [packPrice, setPackPrice] = useState("");

  const [unitHintPrice, setUnitHintPrice] = useState("");
  const [unitFreezePrice, setUnitFreezePrice] = useState("");

  const [dailyPassPriceStr, setDailyPassPriceStr] = useState("");
  const [dailyPassDurationStr, setDailyPassDurationStr] = useState("");

  useEffect(() => {
    loadPacks();
  }, [publicClient]);

  const loadPacks = async () => {
    if (!GAME_ASSETS_CONTRACT || !publicClient) return;
    try {
      const count = await publicClient.readContract({
        address: GAME_ASSETS_CONTRACT,
        abi: GAME_ASSETS_ABI,
        functionName: "getAssetPackCount",
      });
      const loaded = [];
      for (let i = 0; i < Number(count); i++) {
        const pack = await publicClient.readContract({
          address: GAME_ASSETS_CONTRACT,
          abi: GAME_ASSETS_ABI,
          functionName: "getAssetPack",
          args: [BigInt(i)],
        });
        loaded.push({ id: i, ...pack });
      }
      setPacks(loaded);
    } catch { /* ignore */ }
  };

  const handleCreatePack = async () => {
    if (!GAME_ASSETS_CONTRACT || !packName || !packPrice) {
      setMessage("Fill in all fields");
      return;
    }
    setMessage(null);
    try {
      const assetType = packType === "hints" ? GAME_ASSET_TYPES.HINT : GAME_ASSET_TYPES.STREAK_FREEZE;
      const price = Math.round(parseFloat(packPrice) * 1_000_000); // convert USD to 6-dec
      await createAssetPack(packName, assetType, packQty, price);
      setMessage("Pack created");
      setPackName(""); setPackPrice(""); setPackQty(1);
      loadPacks();
    } catch (e: any) {
      setMessage(e?.shortMessage || e?.message || "Failed");
    }
  };

  const handleTogglePack = async (id: number, active: boolean, price: number) => {
    try {
      await updateAssetPack(id, price, !active);
      loadPacks();
    } catch (e: any) {
      setMessage(e?.shortMessage || e?.message);
    }
  };

  const handleSetUnitPrice = async () => {
    if (!GAME_ASSETS_CONTRACT) return;
    try {
      if (unitHintPrice) {
        await setUnitPrice(GAME_ASSET_TYPES.HINT, Math.round(parseFloat(unitHintPrice) * 1_000_000));
      }
      if (unitFreezePrice) {
        await setUnitPrice(GAME_ASSET_TYPES.STREAK_FREEZE, Math.round(parseFloat(unitFreezePrice) * 1_000_000));
      }
      setMessage("Unit prices updated");
    } catch (e: any) {
      setMessage(e?.shortMessage || e?.message);
    }
  };

  if (!GAME_ASSETS_CONTRACT) {
    return (
      <section className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_rgba(0,0,0,1)] opacity-50">
        <h2 className="text-xl font-black uppercase text-black">Game Assets (Contract)</h2>
        <p className="text-xs font-bold uppercase text-black/80 mt-1">Deploy the GameAssets contract and set GAME_ASSETS_CONTRACT in config/wagmi.ts to enable.</p>
      </section>
    );
  }

  return (
    <section className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
      <h2 className="text-xl font-black uppercase text-black">Game Assets Contract</h2>
      <p className="text-xs font-bold uppercase text-black/80 mt-1 break-all">Contract: {GAME_ASSETS_CONTRACT}</p>

      <div className="mt-4 space-y-6">
        {/* Unit Prices */}
        <div>
          <h3 className="font-black text-sm uppercase text-black">Unit Prices (USD)</h3>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <label className="block text-xs font-black uppercase text-black">
              Hint (single)
              <input value={unitHintPrice} onChange={(e) => setUnitHintPrice(e.target.value)} placeholder="0.01" className="mt-1 w-full border-2 border-black px-3 py-2 text-xs font-bold" />
            </label>
            <label className="block text-xs font-black uppercase text-black">
              Streak Freeze (single)
              <input value={unitFreezePrice} onChange={(e) => setUnitFreezePrice(e.target.value)} placeholder="0.05" className="mt-1 w-full border-2 border-black px-3 py-2 text-xs font-bold" />
            </label>
          </div>
          <button onClick={handleSetUnitPrice} className="mt-2 bg-black text-cyan-300 py-2 px-4 font-black text-xs uppercase border-2 border-cyan-300">
            Set Prices
          </button>
        </div>

        {/* Create Pack */}
        <div>
          <h3 className="font-black text-sm uppercase text-black">Create Pack</h3>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="block text-xs font-black uppercase text-black">
              Name
              <input value={packName} onChange={(e) => setPackName(e.target.value)} placeholder="5 Hints" className="mt-1 w-full border-2 border-black px-3 py-2 text-xs font-bold" />
            </label>
            <label className="block text-xs font-black uppercase text-black">
              Type
              <select value={packType} onChange={(e) => setPackType(e.target.value as any)} className="mt-1 w-full border-2 border-black px-3 py-2 text-xs font-bold bg-white">
                <option value="hints">Hints</option>
                <option value="streak_freeze">Streak Freeze</option>
              </select>
            </label>
            <label className="block text-xs font-black uppercase text-black">
              Qty
              <input type="number" value={packQty} onChange={(e) => setPackQty(parseInt(e.target.value) || 1)} className="mt-1 w-full border-2 border-black px-3 py-2 text-xs font-bold" min={1} />
            </label>
            <label className="block text-xs font-black uppercase text-black">
              Price (USD)
              <input value={packPrice} onChange={(e) => setPackPrice(e.target.value)} placeholder="0.04" className="mt-1 w-full border-2 border-black px-3 py-2 text-xs font-bold" />
            </label>
          </div>
          <button onClick={handleCreatePack} className="mt-2 bg-black text-cyan-300 py-2 px-4 font-black text-xs uppercase border-2 border-cyan-300">
            Create Pack
          </button>
        </div>

        {/* Existing Packs */}
        {packs.length > 0 && (
          <div>
            <h3 className="font-black text-sm uppercase text-black">Existing Packs</h3>
            <div className="mt-2 divide-y-2 divide-black max-h-48 overflow-y-auto">
              {packs.map((pack: any) => (
                <div key={pack.id} className="py-2 px-1 flex items-center gap-2 text-xs font-bold justify-between">
                  <span className="font-black">{pack.name}</span>
                  <span>{(Number(pack.price) / 1_000_000).toFixed(2)} USD · {String(pack.quantity)}x</span>
                  <button
                    onClick={() => handleTogglePack(pack.id, pack.active, Number(pack.price))}
                    className={`px-2 py-0.5 border border-black text-[10px] font-black ${pack.active ? "bg-green-300" : "bg-red-300"}`}
                  >
                    {pack.active ? "Active" : "Off"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Daily Pass */}
        <div>
          <h3 className="font-black text-sm uppercase text-black">Daily Pass</h3>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <label className="block text-xs font-black uppercase text-black">
              Price (6-dec USD)
              <input value={dailyPassPriceStr} onChange={(e) => setDailyPassPriceStr(e.target.value)} placeholder="0.01" className="mt-1 w-full border-2 border-black px-3 py-2 text-xs font-bold" />
            </label>
            <label className="block text-xs font-black uppercase text-black">
              Duration (hours)
              <input value={dailyPassDurationStr} onChange={(e) => setDailyPassDurationStr(e.target.value)} placeholder="24" className="mt-1 w-full border-2 border-black px-3 py-2 text-xs font-bold" />
            </label>
            <div className="flex items-end gap-2">
              <button
                onClick={async () => {
                  if (!dailyPassPriceStr) return;
                  try {
                    await setDailyPassPrice(Math.round(parseFloat(dailyPassPriceStr) * 1_000_000));
                    if (dailyPassDurationStr) {
                      await setDailyPassDuration(parseInt(dailyPassDurationStr) * 3600);
                    }
                    setMessage("Daily pass config updated");
                  } catch (e: any) {
                    setMessage(e?.shortMessage || e?.message || "Failed");
                  }
                }}
                className="bg-black text-cyan-300 py-2 px-4 font-black text-xs uppercase border-2 border-cyan-300"
              >
                Set
              </button>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <label className="block text-xs font-black uppercase text-black flex-1">
              Grant Daily Pass to wallet
              <input value={grantWallet} onChange={(e) => setGrantWallet(e.target.value)} placeholder="0x..." className="mt-1 w-full border-2 border-black px-3 py-2 text-xs font-bold" />
            </label>
            <button
              onClick={async () => {
                if (!/^0x[a-fA-F0-9]{40}$/.test(grantWallet)) { setMessage("Valid address required"); return; }
                try {
                  await grantDailyPass(grantWallet as `0x${string}`);
                  setMessage(`Daily pass granted to ${grantWallet.slice(0, 10)}...`);
                  setGrantWallet("");
                } catch (e: any) {
                  setMessage(e?.shortMessage || e?.message || "Failed");
                }
              }}
              className="bg-black text-cyan-300 py-3 px-4 font-black text-xs uppercase border-2 border-cyan-300 self-end"
            >
              Grant
            </button>
          </div>
        </div>

        {message && (
          <div className="bg-yellow-200 border-2 border-black p-2 text-xs font-black uppercase">{message}</div>
        )}
      </div>
    </section>
  );
}

/* ---- Access Config Admin ---- */

export function AccessConfigAdmin() {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    window.fetch("/api/admin/access-config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  const handleChange = (key: string, value: string) => {
    if (key === "unlockAmountUsd") {
      setConfig((prev) => ({ ...prev, [key]: value }));
    } else {
      const num = parseFloat(value);
      if (!Number.isNaN(num)) setConfig((prev) => ({ ...prev, [key]: num }));
    }
  };

  const save = async () => {
    setMessage(null);
    try {
      const res = await window.fetch("/api/admin/access-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setMessage("Access config saved to database.");
      } else {
        const err = await res.json();
        setMessage(err.message);
      }
    } catch (e: any) {
      setMessage(e.message);
    }
  };

  const fields: { key: string; label: string }[] = [
    { key: "dailyFreePuzzles", label: "Free Puzzles / Day" },
    { key: "unlockAmountUsd", label: "Unlock Amount (USD)" },
    { key: "unlockDurationHours", label: "Unlock Duration (hours)" },
  ];

  if (!Object.keys(config).length) return null;

  return (
    <section className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
      <h2 className="text-xl font-black uppercase text-black">Access Config</h2>
      <p className="text-xs font-bold uppercase text-black/80 mt-1">Free daily puzzles, unlock price, and duration. Saved to database.</p>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {fields.map((f) => (
          <label key={f.key} className="block text-xs font-black uppercase text-black">
            {f.label}
            <input
              type={f.key === "unlockAmountUsd" ? "text" : "number"}
              value={config[f.key] ?? ""}
              onChange={(e) => handleChange(f.key, e.target.value)}
              className="mt-1 w-full border-2 border-black px-3 py-2 text-xs font-bold"
              step={f.key === "unlockAmountUsd" ? "0.01" : "1"}
              min={f.key === "unlockDurationHours" ? 1 : 0}
            />
          </label>
        ))}
      </div>
      <button
        onClick={save}
        className="mt-3 bg-black text-cyan-300 py-2 px-6 font-black text-xs uppercase border-2 border-cyan-300"
      >
        Save Access Config
      </button>
      {message && (
        <div className="mt-2 bg-yellow-200 border-2 border-black p-2 text-xs font-black uppercase">{message}</div>
      )}
    </section>
  );
}
