/**
 * Text helpers: accent-insensitive matching and the light name obfuscation
 * used in data/players.json. This only deters casual peeking.
 */

export function fold(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ø/gi, "o")
    .replace(/ł/gi, "l")
    .replace(/đ/gi, "d")
    .replace(/ð/gi, "d")
    .replace(/þ/gi, "th")
    .replace(/ß/g, "ss")
    .replace(/æ/gi, "ae")
    .replace(/œ/gi, "oe")
    .toLowerCase()
    .trim();
}

export function deobfuscate(value) {
  if (!value) return "";
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Remove answer text if a club note or alias still contains it. */
export function maskNames(text, names) {
  let out = String(text ?? "");
  const sorted = [...names]
    .filter((name) => name && String(name).trim().length >= 4)
    .sort((a, b) => b.length - a.length);
  sorted.forEach((name) => {
    out = out.replace(new RegExp(escapeRegExp(name), "ig"), "");
  });
  return out.replace(/\s{2,}/g, " ").trim();
}

export function decadeLabel(year) {
  if (!year) return "Unknown decade";
  const start = Math.floor(year / 10) * 10;
  return `${start}s`;
}

export function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
