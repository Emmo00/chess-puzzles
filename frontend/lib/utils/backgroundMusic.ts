export const MUSIC_PREF_KEY = "chess-puzzles:bg-music-enabled";
export const MUSIC_PREF_EVENT = "chess-puzzles:bg-music-pref-changed";

export const isMusicEnabled = (): boolean => {
  if (typeof window === "undefined") {
    return true;
  }
  return localStorage.getItem(MUSIC_PREF_KEY) !== "off";
};

export const setMusicEnabled = (enabled: boolean): void => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(MUSIC_PREF_KEY, enabled ? "on" : "off");
  window.dispatchEvent(new Event(MUSIC_PREF_EVENT));
};
