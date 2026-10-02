/**
 * Spoiler-free emoji share text.
 * 🟥 wrong, 🟩 correct, ⬜ unused. Player names are never included.
 */

import { shareRow } from "./game.js";

export function buildShareText({ puzzle, streak, rounds, url }) {
  const lines = rounds.map((round, index) => `Player ${index + 1}: ${shareRow(round)}`);
  return [`Journeyman #${puzzle} 🔥 Streak: ${streak}`, ...lines, url].join("\n");
}

export function isMobileShareDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

/**
 * Prefer the Web Share API on mobile. Everywhere else, copy to the clipboard.
 * Returns "shared", "copied", or "failed".
 */
export async function shareResult(text) {
  if (isMobileShareDevice() && typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (error) {
      if (error && error.name === "AbortError") return "aborted";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return copyWithFallback(text) ? "copied" : "failed";
  }
}

function copyWithFallback(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}
