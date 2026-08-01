import confetti from "canvas-confetti";

export const LEVEL_TRACKING_KEY = "chess-puzzles:last-known-level";

const THEME_COLORS = ["#a3ff12", "#00e5ff", "#ffd600", "#ff6b57", "#ffffff"];

export function fireLevelUpConfetti(): void {
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  confetti({
    particleCount: 90,
    spread: 70,
    startVelocity: 45,
    origin: { y: 0.7 },
    colors: THEME_COLORS,
  });

  setTimeout(() => {
    confetti({
      particleCount: 120,
      spread: 100,
      startVelocity: 38,
      origin: { x: 0.2, y: 0.7 },
      colors: THEME_COLORS,
    });
  }, 200);

  setTimeout(() => {
    confetti({
      particleCount: 120,
      spread: 100,
      startVelocity: 38,
      origin: { x: 0.8, y: 0.7 },
      colors: THEME_COLORS,
    });
  }, 320);
}
