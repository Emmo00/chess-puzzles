"use client";

import { useEffect, useRef, useState } from "react";
import {
  isMusicEnabled,
  MUSIC_PREF_EVENT,
  setMusicEnabled,
} from "@/lib/utils/backgroundMusic";

const TRACKS = ["/goldberg.mp3", "/gymnopedie-1.mp3"] as const;

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
  const [enabled, setEnabled] = useState<boolean>(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEnabled(isMusicEnabled());

    const syncPreference = () => {
      setEnabled(isMusicEnabled());
    };

    window.addEventListener("storage", syncPreference);
    window.addEventListener(MUSIC_PREF_EVENT, syncPreference);
    setReady(true);

    return () => {
      window.removeEventListener("storage", syncPreference);
      window.removeEventListener(MUSIC_PREF_EVENT, syncPreference);
    };
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
      setMusicEnabled(false);
      return;
    }

    setMusicEnabled(true);

    const playImmediately = async () => {
      try {
        audioEl.muted = false;
        await audioEl.play();
        return;
      } catch {
        // Fallback path for stricter autoplay policies.
      }

      try {
        audioEl.muted = true;
        await audioEl.play();
        audioEl.muted = false;
      } catch {
        // Some browsers still require a user gesture before audible playback.
      }
    };

    playImmediately();

    const unlockOnInteraction = () => {
      audioEl.muted = false;
      audioEl.play().catch(() => {
        // If still blocked, keep silent failure to avoid noisy errors.
      });
    };

    window.addEventListener("pointerdown", unlockOnInteraction);
    window.addEventListener("keydown", unlockOnInteraction);

    return () => {
      window.removeEventListener("pointerdown", unlockOnInteraction);
      window.removeEventListener("keydown", unlockOnInteraction);
    };
  }, [enabled, ready]);

  return (
    <audio
      ref={audioRef}
      loop
      preload="auto"
      autoPlay
      aria-hidden="true"
      className="hidden"
    />
  );
}