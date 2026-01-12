"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserSettings } from "../../lib/types";
import { PUZZLE_THEMES, THEME_CATEGORIES, DEFAULT_THEMES } from "../../lib/config/puzzleThemes";

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    ratingRange: { min: 800, max: 2000 },
    disabledThemes: [],
  });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  const { address, isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isConnected) {
      router.push("/");
      return;
    }

    if (mounted && address) {
      fetchSettings();
    }
  }, [mounted, address, isConnected, router]);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/users/settings", {
        headers: {
          Authorization: `Bearer ${address}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/users/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${address}`,
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setHasChanges(false);
      } else {
        const error = await response.json();
        alert(error.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRatingChange = (type: "min" | "max", value: number) => {
    setSettings((prev) => ({
      ...prev,
      ratingRange: {
        ...prev.ratingRange,
        [type]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleThemeToggle = (themeId: string) => {
    setSettings((prev) => {
      const isDisabled = prev.disabledThemes.includes(themeId);
      let newDisabled: string[];
      
      if (isDisabled) {
        // Enable theme by removing from disabled
        newDisabled = prev.disabledThemes.filter((t) => t !== themeId);
      } else {
        // Disable theme by adding to disabled
        // Ensure at least one theme remains enabled
        if (prev.disabledThemes.length >= DEFAULT_THEMES.length - 1) {
          return prev;
        }
        newDisabled = [...prev.disabledThemes, themeId];
      }
      
      return {
        ...prev,
        disabledThemes: newDisabled,
      };
    });
    setHasChanges(true);
  };

  const handleCategoryToggle = (category: string) => {
    const themeIds = THEME_CATEGORIES[category as keyof typeof THEME_CATEGORIES];
    const allEnabled = themeIds.every((id) => !settings.disabledThemes.includes(id));

    setSettings((prev) => {
      let newDisabled: string[];
      if (allEnabled) {
        // Disable all in category by adding to disabled
        const combined = [...prev.disabledThemes, ...themeIds];
        newDisabled = combined.filter((value, index, self) => self.indexOf(value) === index);
        
        // Ensure at least one theme remains enabled
        if (newDisabled.length >= DEFAULT_THEMES.length) {
          return prev;
        }
      } else {
        // Enable all in category by removing from disabled
        newDisabled = prev.disabledThemes.filter((t) => !themeIds.includes(t));
      }
      
      return {
        ...prev,
        disabledThemes: newDisabled,
      };
    });
    setHasChanges(true);
  };

  const handleToggleAllThemes = () => {
    const allEnabled = settings.disabledThemes.length === 0;
    setSettings((prev) => ({
      ...prev,
      // If all enabled, disable all except first; if some disabled, enable all
      disabledThemes: allEnabled ? DEFAULT_THEMES.slice(1) : [],
    }));
    setHasChanges(true);
  };

  const toggleCategoryExpand = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const getRatingLabel = (rating: number) => {
    if (rating < 1000) return "Beginner";
    if (rating < 1400) return "Intermediate";
    if (rating < 1800) return "Advanced";
    if (rating < 2200) return "Expert";
    return "Master";
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="w-screen h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white text-black flex flex-col">
      {/* Header */}
      <header className="pt-4 px-4 flex justify-between items-center shrink-0 sticky top-0 bg-white z-20 border-b-4 border-black">
        <Link
          href="/"
          className="bg-black text-white px-2 py-1 font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all"
        >
          ← BACK
        </Link>
        <div className="px-4 py-2 font-black text-sm border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-lime-400 text-black">
          ⚙ SETTINGS
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 py-6 gap-6 pb-24">
        <div className="w-full max-w-md space-y-6">
          {/* Rating Range Section */}
          <div className="bg-cyan-400 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4">
            <h2 className="font-black text-xl text-black mb-4">📊 PUZZLE RATING RANGE</h2>
            
            <div className="space-y-4">
              {/* Min Rating */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-black text-black">MIN RATING</span>
                  <span className="bg-black text-cyan-400 px-3 py-1 font-black">
                    {settings.ratingRange.min} ({getRatingLabel(settings.ratingRange.min)})
                  </span>
                </div>
                <input
                  type="range"
                  min="400"
                  max="2800"
                  step="100"
                  value={settings.ratingRange.min}
                  onChange={(e) => handleRatingChange("min", Math.min(parseInt(e.target.value), settings.ratingRange.max - 100))}
                  className="w-full h-4 bg-white border-2 border-black appearance-none cursor-pointer accent-black"
                />
              </div>

              {/* Max Rating */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-black text-black">MAX RATING</span>
                  <span className="bg-black text-cyan-400 px-3 py-1 font-black">
                    {settings.ratingRange.max} ({getRatingLabel(settings.ratingRange.max)})
                  </span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="3000"
                  step="100"
                  value={settings.ratingRange.max}
                  onChange={(e) => handleRatingChange("max", Math.max(parseInt(e.target.value), settings.ratingRange.min + 100))}
                  className="w-full h-4 bg-white border-2 border-black appearance-none cursor-pointer accent-black"
                />
              </div>
            </div>

            <div className="mt-4 text-sm font-bold text-black/70">
              Puzzles will be between {settings.ratingRange.min} and {settings.ratingRange.max} rating.
            </div>
          </div>

          {/* Themes Section */}
          <div className="bg-purple-400 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-xl text-black">🎯 PUZZLE THEMES</h2>
              <button
                onClick={handleToggleAllThemes}
                className="bg-black text-white px-3 py-1 font-black text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px transition-all"
              >
                {settings.disabledThemes.length === 0 ? "DESELECT ALL" : "SELECT ALL"}
              </button>
            </div>

            <div className="text-sm font-bold text-black/70 mb-4">
              {DEFAULT_THEMES.length - settings.disabledThemes.length} of {DEFAULT_THEMES.length} themes enabled
            </div>

            {/* Theme Categories */}
            <div className="space-y-2">
              {Object.entries(THEME_CATEGORIES).map(([category, themeIds]) => {
                const isExpanded = expandedCategories.has(category);
                const enabledCount = themeIds.filter((id) => !settings.disabledThemes.includes(id)).length;
                const allEnabled = enabledCount === themeIds.length;

                return (
                  <div key={category} className="bg-white border-2 border-black">
                    {/* Category Header */}
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleCategoryExpand(category)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-black">{category}</span>
                        <span className="text-xs font-bold text-black/60">
                          ({enabledCount}/{themeIds.length})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCategoryToggle(category);
                          }}
                          className={`px-2 py-1 text-xs font-black border-2 border-black ${
                            allEnabled ? "bg-green-400" : "bg-gray-200"
                          }`}
                        >
                          {allEnabled ? "ON" : "OFF"}
                        </button>
                        <span className="font-black text-black">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {/* Individual Themes */}
                    {isExpanded && (
                      <div className="border-t-2 border-black p-2 grid grid-cols-2 gap-1">
                        {themeIds.map((themeId) => {
                          const theme = PUZZLE_THEMES.find((t) => t.id === themeId);
                          const isEnabled = !settings.disabledThemes.includes(themeId);
                          return (
                            <button
                              key={themeId}
                              onClick={() => handleThemeToggle(themeId)}
                              className={`p-2 text-xs font-bold border border-black text-left ${
                                isEnabled ? "bg-green-300" : "bg-gray-100"
                              }`}
                              title={theme?.description}
                            >
                              {theme?.name || themeId}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Save Button */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t-4 border-black">
          <div className="max-w-md mx-auto">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="w-full bg-green-400 text-black py-4 px-6 font-black text-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all disabled:opacity-50"
            >
              {saving ? "SAVING..." : "💾 SAVE SETTINGS"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
