"use client";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Settings, Save, AlertTriangle } from "lucide-react";

interface AppConfig {
  key: string;
  value: Record<string, unknown>;
}

export default function ConfigPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [configs, setConfigs] = useState<AppConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("scoring");
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        setAuthenticated(true);
        fetchConfigs();
      } else {
        window.location.href = "/login";
      }
    } catch {
      window.location.href = "/login";
    }
  };

  const fetchConfigs = async () => {
    try {
      const res = await fetch("/api/admin/config");
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.configs || []);
        
        // Set initial edit value for scoring tab
        const scoringConfig = data.configs?.find((c: AppConfig) => c.key === "scoring");
        if (scoringConfig) {
          setEditValue(JSON.stringify(scoringConfig.value, null, 2));
        }
      }
    } catch (error) {
      console.error("Failed to fetch configs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const config = configs.find((c) => c.key === tab);
    setEditValue(config ? JSON.stringify(config.value, null, 2) : "{}");
    setError(null);
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate JSON
      const parsed = JSON.parse(editValue);

      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: activeTab, value: parsed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save config");
      }

      setSuccess(true);
      fetchConfigs();
    } catch (e: any) {
      if (e instanceof SyntaxError) {
        setError("Invalid JSON format");
      } else {
        setError(e.message);
      }
    } finally {
      setSaving(false);
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
        <h1 className="text-2xl font-bold text-gray-900">Configuration</h1>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {["scoring", "access", "puzzleRush"].map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Editor */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Configuration
            </h2>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              JSON Configuration
            </label>
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={20}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono"
              spellCheck={false}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          {success && (
            <p className="text-sm text-green-600">Configuration saved successfully!</p>
          )}
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Caution</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Changes to this configuration directly affect scoring, access rules, and puzzle rush settings.
                Please verify all values before saving.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Navigation>
  );
}
