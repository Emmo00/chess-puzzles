"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { Navigation } from "@/components/Navigation";
import { GAME_ASSETS_CONTRACT, GAME_ASSETS_ABI, GAME_ASSET_TYPES } from "@/lib/contracts";
import { Package, DollarSign, Gift, Plus } from "lucide-react";

interface AssetPack {
  name: string;
  assetType: string;
  quantity: number;
  price: number;
  active: boolean;
}

interface GameAssetsData {
  assetPacks: AssetPack[];
  unitPrices: { hint: number; streakFreeze: number };
  dailyPassPrice: number;
  dailyPassDuration: number;
  treasury: string;
  paymentTokens: string[];
}

const GRANTER_ROLE_HASH = "0x2dee5dd865e09c7ce6788d674a03682994f0b44339403ca07ac129a9de4bed6a";

export default function GameAssetsPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [data, setData] = useState<GameAssetsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        setAuthenticated(true);
        fetchData();
      } else {
        window.location.href = "/login";
      }
    } catch {
      window.location.href = "/login";
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/game-assets");
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (error) {
      console.error("Failed to fetch game assets:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authenticated === null || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Navigation>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Game Assets Configuration</h1>

        {/* ── Asset Packs Table (read-only) ── */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Asset Packs
            </h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Name", "Type", "Qty", "Price (USDC)", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data?.assetPacks?.map((pack, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pack.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {pack.assetType.slice(0, 10)}…
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pack.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${(pack.price / 1e6).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        pack.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {pack.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
              {(!data?.assetPacks || data.assetPacks.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No asset packs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Set Unit Prices (wallet-signed) ── */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Unit Prices
          </h2>
          <p className="text-sm text-gray-500 mb-4">Current on-chain prices. Change requires contract owner wallet.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Hint Price</p>
              <p className="text-xl font-bold text-gray-900">${((data?.unitPrices?.hint ?? 0) / 1e6).toFixed(2)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Streak Freeze Price</p>
              <p className="text-xl font-bold text-gray-900">
                ${((data?.unitPrices?.streakFreeze ?? 0) / 1e6).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <SetUnitPriceCard
              label="Set Hint Price"
              assetType={GAME_ASSET_TYPES.HINT}
              currentValue={data?.unitPrices?.hint ?? 0}
              onSuccess={() => fetchData()}
            />
            <SetUnitPriceCard
              label="Set Streak Freeze Price"
              assetType={GAME_ASSET_TYPES.STREAK_FREEZE}
              currentValue={data?.unitPrices?.streakFreeze ?? 0}
              onSuccess={() => fetchData()}
            />
          </div>
        </div>

        {/* ── Daily Pass (read + write) ── */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Daily Pass
          </h2>
          <p className="text-sm text-gray-500 mb-4">Controls the Puzzle Rush daily pass price.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Price</p>
              <p className="text-xl font-bold text-gray-900">${((data?.dailyPassPrice ?? 0) / 1e6).toFixed(2)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Duration</p>
              <p className="text-xl font-bold text-gray-900">{data?.dailyPassDuration ?? 0}s</p>
            </div>
          </div>
          <SetDailyPassPriceCard currentValue={data?.dailyPassPrice ?? 0} onSuccess={() => fetchData()} />
        </div>

        {/* ── Create Asset Pack (wallet-signed) ── */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Asset Pack
          </h2>
          <p className="text-sm text-gray-500 mb-4">Mint a new pack on-chain. Requires contract owner wallet.</p>
          <CreateAssetPackCard onSuccess={() => fetchData()} />
        </div>

        {/* ── Grant to User (wallet-signed) ── */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Grant to User</h2>
          <p className="text-sm text-gray-600 mb-4">
            Grant assets to a user directly from your connected wallet (requires GRANTER_ROLE).
          </p>
          <GrantAssetForm onSuccess={() => fetchData()} />
        </div>
      </div>
    </Navigation>
  );
}

/* ═══════════════════════════════════════════════════════
   Set Unit Price (wallet-signed)
   ═══════════════════════════════════════════════════════ */

function SetUnitPriceCard({
  label,
  assetType,
  currentValue,
  onSuccess,
}: {
  label: string;
  assetType: `0x${string}`;
  currentValue: number;
  onSuccess: () => void;
}) {
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    if (currentValue > 0) setPrice((currentValue / 1e6).toFixed(2));
  }, [currentValue]);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);
    try {
      const wei = BigInt(Math.round(parseFloat(price) * 1e6));
      await writeContractAsync({
        address: GAME_ASSETS_CONTRACT,
        abi: GAME_ASSETS_ABI,
        functionName: "setUnitPrice",
        args: [assetType, wei],
      });
      setSuccess(true);
      onSuccess();
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "Transaction failed");
    }
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <h3 className="font-medium text-gray-900">{label}</h3>
      <div className="flex flex-wrap gap-3 items-end mt-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (USDC)</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!isConnected || !price}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {!isConnected ? "Connect Wallet" : "Update Price"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-2 text-sm text-green-600">Price updated!</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Set Daily Pass Price (wallet-signed)
   ═══════════════════════════════════════════════════════ */

function SetDailyPassPriceCard({ currentValue, onSuccess }: { currentValue: number; onSuccess: () => void }) {
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    if (currentValue > 0) setPrice((currentValue / 1e6).toFixed(2));
  }, [currentValue]);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);
    try {
      const wei = BigInt(Math.round(parseFloat(price) * 1e6));
      await writeContractAsync({
        address: GAME_ASSETS_CONTRACT,
        abi: GAME_ASSETS_ABI,
        functionName: "setDailyPassPrice",
        args: [wei],
      });
      setSuccess(true);
      onSuccess();
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "Transaction failed");
    }
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <h3 className="font-medium text-gray-900">Set Daily Pass Price</h3>
      <div className="flex flex-wrap gap-3 items-end mt-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (USDC)</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!isConnected || !price}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {!isConnected ? "Connect Wallet" : "Update Price"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-2 text-sm text-green-600">Price updated!</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Create Asset Pack (wallet-signed)
   ═══════════════════════════════════════════════════════ */

function CreateAssetPackCard({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState("hint");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);
    try {
      const assetTypeHash = assetType === "hint" ? GAME_ASSET_TYPES.HINT : GAME_ASSET_TYPES.STREAK_FREEZE;
      const wei = BigInt(Math.round(parseFloat(price) * 1e6));

      await writeContractAsync({
        address: GAME_ASSETS_CONTRACT,
        abi: GAME_ASSETS_ABI,
        functionName: "createAssetPack",
        args: [name, assetTypeHash, BigInt(parseInt(quantity, 10)), wei],
      });
      setSuccess(true);
      setName("");
      setQuantity("1");
      setPrice("");
      onSuccess();
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "Transaction failed");
    }
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pack Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Starter Pack"
            className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type</label>
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
            className="block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="hint">Hint</option>
            <option value="streakFreeze">Streak Freeze</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (USDC)</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="block w-28 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!isConnected || !name || !price}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {!isConnected ? "Connect Wallet" : "Create Pack"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-2 text-sm text-green-600">Pack created!</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Grant Asset (wallet-signed, checks GRANTER_ROLE)
   ═══════════════════════════════════════════════════════ */

function GrantAssetForm({ onSuccess }: { onSuccess: () => void }) {
  const [wallet, setWallet] = useState("");
  const [assetType, setAssetType] = useState("hint");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { address: connectedWallet, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const { data: hasRole, isLoading: roleLoading } = useReadContract({
    address: GAME_ASSETS_CONTRACT,
    abi: GAME_ASSETS_ABI,
    functionName: "hasRole",
    args: [GRANTER_ROLE_HASH as `0x${string}`, connectedWallet!],
    query: { enabled: isConnected && !!connectedWallet },
  });

  console.log(connectedWallet, "has the", GRANTER_ROLE_HASH, "role:", hasRole);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);
    try {
      const assetTypeHash = assetType === "hint" ? GAME_ASSET_TYPES.HINT : GAME_ASSET_TYPES.STREAK_FREEZE;

      await writeContractAsync({
        address: GAME_ASSETS_CONTRACT,
        abi: GAME_ASSETS_ABI,
        functionName: "grantAsset",
        args: [wallet as `0x${string}`, assetTypeHash, BigInt(parseInt(quantity, 10))],
      });
      setSuccess(true);
      onSuccess();
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "Grant failed");
    }
  };

  const canGrant = isConnected && hasRole === true;

  return (
    <div>
      {!isConnected && <p className="text-sm text-amber-600 mb-3">Connect your wallet to grant assets.</p>}
      {isConnected && !roleLoading && hasRole === false && (
        <p className="text-sm text-amber-600 mb-3">
          Your wallet does not have GRANTER_ROLE on the GameAssets contract.
        </p>
      )}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Wallet Address</label>
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x..."
            className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type</label>
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
            className="block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="hint">Hint</option>
            <option value="streakFreeze">Streak Freeze</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!canGrant || !wallet}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {!isConnected ? "Connect Wallet" : roleLoading ? "Checking…" : "Grant"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-2 text-sm text-green-600">Asset granted!</p>}
    </div>
  );
}
