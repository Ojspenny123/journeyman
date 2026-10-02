/**
 * localStorage persistence. Every key starts with journeyman_.
 * A day counts toward the streak only when all 3 rounds are finished.
 * Missing a whole UK day resets the current streak to 0.
 */

import { addDays } from "./daily.js";

export const KEYS = {
  state: "journeyman_state",
  stats: "journeyman_stats",
  howto: "journeyman_howto_seen",
};

export function emptyStats() {
  return {
    currentStreak: 0,
    bestStreak: 0,
    lastCompleted: null,
    gamesPlayed: 0,
    playersFaced: 0,
    playersSolved: 0,
    distribution: [0, 0, 0, 0, 0, 0],
  };
}

function memoryStore() {
  if (!globalThis.__journeymanMemory) globalThis.__journeymanMemory = new Map();
  return {
    getItem: (key) => (globalThis.__journeymanMemory.has(key) ? globalThis.__journeymanMemory.get(key) : null),
    setItem: (key, value) => globalThis.__journeymanMemory.set(key, String(value)),
    removeItem: (key) => globalThis.__journeymanMemory.delete(key),
  };
}

function store() {
  try {
    if (typeof localStorage !== "undefined") {
      const probe = "journeyman_probe";
      localStorage.setItem(probe, "1");
      localStorage.removeItem(probe);
      return localStorage;
    }
  } catch {
    /* private mode */
  }
  return memoryStore();
}

function readJson(key) {
  try {
    const raw = store().getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  store().setItem(key, JSON.stringify(value));
}

export function loadStats() {
  const saved = readJson(KEYS.stats);
  if (!saved || !Array.isArray(saved.distribution) || saved.distribution.length !== 6) {
    return emptyStats();
  }
  return { ...emptyStats(), ...saved, distribution: saved.distribution.slice(0, 6) };
}

export function saveStats(stats) {
  writeJson(KEYS.stats, stats);
}

export function loadProgress() {
  const saved = readJson(KEYS.state);
  if (!saved || !saved.date || !Array.isArray(saved.playerIds) || !Array.isArray(saved.rounds)) {
    return null;
  }
  if (saved.playerIds.length !== 3 || saved.rounds.length !== 3) return null;
  return saved;
}

export function saveProgress(progress) {
  writeJson(KEYS.state, progress);
}

export function hasSeenHowTo() {
  return store().getItem(KEYS.howto) === "1";
}

export function markHowToSeen() {
  store().setItem(KEYS.howto, "1");
}

/** Streak still alive only if the last finished day was today or yesterday (UK). */
export function effectiveStreak(stats, today) {
  if (!stats.lastCompleted || !stats.currentStreak) return 0;
  if (stats.lastCompleted === today || stats.lastCompleted === addDays(today, -1)) {
    return stats.currentStreak;
  }
  return 0;
}

export function winRate(stats) {
  if (!stats.playersFaced) return 0;
  return Math.round((stats.playersSolved / stats.playersFaced) * 100);
}

/**
 * Record a finished day once. Later visits the same day do not double count.
 */
export function recordCompletion(stats, today, rounds) {
  if (stats.lastCompleted === today) return stats;
  const continued = stats.lastCompleted === addDays(today, -1);
  const currentStreak = continued ? stats.currentStreak + 1 : 1;
  const distribution = stats.distribution.slice();
  rounds.forEach((round) => {
    if (round.status === "won" && round.guessesUsed >= 1 && round.guessesUsed <= 5) {
      distribution[round.guessesUsed - 1] += 1;
    } else {
      distribution[5] += 1;
    }
  });
  return {
    ...stats,
    currentStreak,
    bestStreak: Math.max(stats.bestStreak || 0, currentStreak),
    lastCompleted: today,
    gamesPlayed: (stats.gamesPlayed || 0) + 1,
    playersFaced: (stats.playersFaced || 0) + rounds.length,
    playersSolved: (stats.playersSolved || 0) + rounds.filter((round) => round.status === "won").length,
    distribution,
  };
}
