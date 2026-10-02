/**
 * Daily puzzle selection.
 * The seed is the number of UK civil days since the launch date, so every
 * player gets the same three footballers until midnight Europe/London.
 * Players are shuffled per cycle and dealt in groups of three, so nobody
 * repeats until that cycle's pool is exhausted.
 */

export const LAUNCH_DATE = "2026-08-22";

export function getLondonDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function getLondonTimeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** Milliseconds from this instant until the next midnight in London. */
export function msUntilLondonMidnight(date = new Date()) {
  const { hour, minute, second } = getLondonTimeParts(date);
  const elapsed = ((hour * 60 + minute) * 60 + second) * 1000 + date.getMilliseconds();
  return 86400000 - elapsed;
}

export function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function addDays(dateStr, delta) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function civilDayNumber(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

/** Puzzle #1 is the launch date. */
export function puzzleNumberFor(londonDate, launchDate = LAUNCH_DATE) {
  return Math.max(1, civilDayNumber(londonDate) - civilDayNumber(launchDate) + 1);
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle(items, seed) {
  const copy = items.slice();
  const random = mulberry32(seed);
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function cycleSeed(cycle) {
  return (0x4a0e + cycle * 997) >>> 0;
}

/**
 * Pick 3 ids for a puzzle number.
 * The pool is shuffled, dealt in order, then shuffled again only after every
 * player has been used. A day that crosses that boundary never repeats a
 * player inside the same trio.
 */
export function selectDailyIds(ids, puzzleNumber) {
  if (!Array.isArray(ids) || ids.length < 3) {
    throw new Error("At least 3 players are required");
  }
  const unique = [...new Set(ids)];
  const safePuzzle = Math.max(1, puzzleNumber | 0);
  const startSlot = (safePuzzle - 1) * 3;
  const cycle = Math.floor(startSlot / unique.length);
  const offset = startSlot % unique.length;
  const current = seededShuffle(unique, cycleSeed(cycle));
  if (offset + 3 <= unique.length) {
    return current.slice(offset, offset + 3);
  }
  const picks = current.slice(offset);
  const next = seededShuffle(unique, cycleSeed(cycle + 1));
  next.forEach((id) => {
    if (picks.length < 3 && !picks.includes(id)) picks.push(id);
  });
  return picks;
}
