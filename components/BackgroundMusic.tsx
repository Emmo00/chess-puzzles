"use client";

import { useEffect, useRef, useState } from "react";

const TRACKS = ["/goldberg.mp3", "/gymnopedie-1.mp3"] as const;
const MUSIC_PREF_KEY = "chess-puzzles:bg-music-enabled";

function getSessionTrack(): string {
  if (typeof window === "undefined") {
    return TRACKS[0];
  }

  const existingTrack = sessionStorage.getItem("chess-puzzles:bg-music-track");
  if (existingTrack && TRACKS.includes(existingTrack as (typeof TRACKS)[number])) {
    return existingTrack;
  }

  const selectedTrack = TRACKS[Math.floor(Math.random() * TRACKS.length)];
  sessionStorage.setItem("chess-puzzles:bg-music-track", selectedTrack);
  return selectedTrack;
}

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [ready, setReady] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  useEffect(() => {
    const savedPref = localStorage.getItem(MUSIC_PREF_KEY);
    if (savedPref === "off") {
      setEnabled(false);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const audioEl = audioRef.current;
    if (!audioEl) {
      return;
    }

    if (!audioEl.src) {
      audioEl.src = getSessionTrack();
    }
    audioEl.volume = 0.25;

    if (!enabled) {
      audioEl.pause();
      setAutoplayBlocked(false);
      localStorage.setItem(MUSIC_PREF_KEY, "off");
      return;
    }

    localStorage.setItem(MUSIC_PREF_KEY, "on");

    const playMusic = () => {
      audioEl
        .play()
        .then(() => setAutoplayBlocked(false))
        .catch(() => setAutoplayBlocked(true));
    };

    // Browsers can block autoplay with sound until a user interaction occurs.
    playMusic();
    const unlockOnInteraction = () => playMusic();

    window.addEventListener("pointerdown", unlockOnInteraction, { once: true });
    window.addEventListener("keydown", unlockOnInteraction, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockOnInteraction);
      window.removeEventListener("keydown", unlockOnInteraction);
    };
  }, [enabled, ready]);

  return (
    <>
      <audio ref={audioRef} loop preload="auto" aria-hidden="true" className="hidden" />

      <button
        type="button"
        onClick={() => setEnabled((curr) => !curr)}
        className="fixed bottom-4 right-4 z-100 rounded-full border border-amber-500/50 bg-black/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-amber-200 shadow-lg backdrop-blur-sm transition hover:bg-black/85"
        aria-label={enabled ? "Disable background music" : "Enable background music"}
      >
        {enabled ? "Music: On" : "Music: Off"}
        {enabled && autoplayBlocked ? " (Tap to start)" : ""}
      </button>
    </>
  );
}