"use client";

import { useEffect, useState } from "react";

/* ---- Store Item Manager ---- */

interface StoreItemData {
  _id?: string;
  name: string;
  description: string;
  category: string;
  subtype?: string;
  priceUsd: string;
  quantity: number;
  active: boolean;
  sortOrder: number;
}

const EMPTY_ITEM: StoreItemData = {
  name: "",
  description: "",
  category: "hints",
  priceUsd: "0.01",
  quantity: 1,
  active: true,
  sortOrder: 0,
};

export function StoreItemsAdmin() {
  const [items, setItems] = useState<StoreItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<StoreItemData>({ ...EMPTY_ITEM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await window.fetch("/api/admin/store-items");
      if (res.ok) setItems(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name || !form.category || !form.priceUsd) return;
    setMessage(null);
    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/admin/store-items?id=${editingId}` : "/api/admin/store-items";
      const res = await window.fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMessage(editingId ? "Updated" : "Created");
        setForm({ ...EMPTY_ITEM });
        setEditingId(null);
        load();
      } else {
        const err = await res.json();
        setMessage(err.message || "Save failed");
      }
    } catch (e: any) {
      setMessage(e.message);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await window.fetch(`/api/admin/store-items?id=${id}`, { method: "DELETE" });
    setMessage("Deleted");
    load();
  };

  const edit = (item: StoreItemData) => {
    setForm({ ...item });
    setEditingId(item._id || null);
  };

  const canCancel = editingId || form.name;

  return (
    <section className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
      <h2 className="text-xl font-black uppercase text-black">Store Items</h2>
      <p className="text-xs font-bold uppercase text-black/80 mt-1">Create, edit, or deactivate store catalog items.</p>

      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-xs font-black uppercase text-black">
            Name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full border-2 border-black px-3 py-2 text-xs font-bold"
            />
          </label>
          <label className="block text-xs font-black uppercase text-black">
            Description
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full border-2 border-black px-3 py-2 text-xs font-bold"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="block text-xs font-black uppercase text-black">
            Category
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1 w-full border-2 border-black px-3 py-2 text-xs font-bold bg-white"
            >
              <option value="hints">Hints</option>
              <option value="streak_freeze">Streak Freeze</option>
              <option value="mystery_box">Mystery Box</option>
              <option value="cosmetic">Cosmetic</option>
            </select>
          </label>
          <label className="block text-xs font-black uppercase text-black">
            Price (USDT)
            <input
              value={form.priceUsd}
              onChange={(e) => setForm({ ...form, priceUsd: e.target.value })}
              className="mt-1 w-full border-2 border-black px-3 py-2 text-xs font-bold"
            />
          </label>
          <label className="block text-xs font-black uppercase text-black">
            Qty
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              className="mt-1 w-full border-2 border-black px-3 py-2 text-xs font-bold"
            />
          </label>
          <label className="block text-xs font-black uppercase text-black">
            Sort
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
              className="mt-1 w-full border-2 border-black px-3 py-2 text-xs font-bold"
            />
          </label>
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-bold uppercase text-black">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Active
        </label>

        <div className="flex gap-2">
          <button
            onClick={save}
            className="bg-black text-cyan-300 py-2 px-4 font-black text-xs uppercase border-2 border-cyan-300"
          >
            {editingId ? "Update Item" : "Create Item"}
          </button>
          {canCancel && (
            <button
              onClick={() => { setForm({ ...EMPTY_ITEM }); setEditingId(null); }}
              className="bg-gray-300 text-black py-2 px-4 font-black text-xs uppercase border-2 border-black"
            >
              Cancel
            </button>
          )}
        </div>

        {message && (
          <div className="bg-yellow-200 border-2 border-black p-2 text-xs font-black uppercase">{message}</div>
        )}

        {loading ? (
          <div className="text-xs font-bold">Loading...</div>
        ) : (
          <div className="divide-y-2 divide-black max-h-64 overflow-y-auto">
            {items.map((item) => (
              <div key={item._id} className="py-2 px-2 flex items-center gap-2 text-xs font-bold justify-between">
                <div className="flex-1 min-w-0">
                  <span className="font-black">{item.name}</span>
                  <span className="text-black/60 ml-2">{item.category} · ${item.priceUsd}</span>
                  {!item.active && <span className="ml-2 bg-red-300 px-1 border border-black text-[10px]">OFF</span>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => edit(item)} className="bg-cyan-300 px-2 py-0.5 border border-black text-[10px] font-black">EDIT</button>
                  <button onClick={() => del(item._id!)} className="bg-red-300 px-2 py-0.5 border border-black text-[10px] font-black">DEL</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

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
  const [wallet, setWallet] = useState("");
  const [perk, setPerk] = useState<"hints" | "streakFreezes">("hints");
  const [amount, setAmount] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const grant = async () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      setMessage("Valid wallet address required");
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const res = await window.fetch("/api/admin/grant-perk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet, perk, amount: Math.max(1, Math.floor(amount)) }),
      });
      const data = await res.json();
      setMessage(res.ok ? data.message : data.message || "Grant failed");
    } catch (e: any) {
      setMessage(e.message);
    }
    setPending(false);
  };

  return (
    <section className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
      <h2 className="text-xl font-black uppercase text-black">Grant Perks</h2>
      <p className="text-xs font-bold uppercase text-black/80 mt-1">Manually give hints or streak freezes to a player.</p>
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
        <div className={`mt-2 border-2 border-black p-2 text-xs font-black uppercase ${message.startsWith("Granted") ? "bg-green-300" : "bg-yellow-200"}`}>
          {message}
        </div>
      )}
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
    { key: "defaultHints", label: "Default Hints (new users)" },
    { key: "defaultStreakFreezes", label: "Default Streak Freezes (new users)" },
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
