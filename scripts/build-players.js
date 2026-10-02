#!/usr/bin/env node
/**
 * Build data/players.json from Wikipedia infoboxes.
 *
 * Usage:
 *   node scripts/build-players.js
 *   node scripts/build-players.js "Robin van Persie" "Craig Bellamy"
 *
 * With no names, the curated seed list below is used.
 * Writes:
 *   data/players.json      game data (names and photo URLs are base64)
 *   data/build-report.md   short QA report for a manual check
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "players.json");
const REPORT_PATH = path.join(ROOT, "data", "build-report.md");

const UA = "JourneymanBot/1.0 (static daily puzzle; career-table build; contact: local-dev)";
const API = "https://en.wikipedia.org/w/api.php";

/**
 * Well-known players with varied, multi-club careers.
 * Titles are English Wikipedia page titles (redirects are followed).
 */
export const SEED_PLAYERS = [
  "Nicolas Anelka",
  "Emmanuel Adebayor",
  "Craig Bellamy",
  "Robbie Keane",
  "Mario Balotelli",
  "Ricardo Quaresma",
  "José Antonio Reyes",
  "Carlos Tevez",
  "Radamel Falcao",
  "Diego Forlán",
  "Samuel Eto'o",
  "Zlatan Ibrahimović",
  "Luis Suárez (Uruguayan footballer)",
  "Alexis Sánchez",
  "Pierre-Emerick Aubameyang",
  "Alexandre Lacazette",
  "Olivier Giroud",
  "Edinson Cavani",
  "Gonzalo Higuaín",
  "Ángel Di María",
  "James Rodríguez",
  "Juan Mata",
  "Mesut Özil",
  "Cesc Fàbregas",
  "Santi Cazorla",
  "Philippe Coutinho",
  "Robin van Persie",
  "Dirk Kuyt",
  "Wesley Sneijder",
  "Rafael van der Vaart",
  "Arjen Robben",
  "Clarence Seedorf",
  "Rivaldo",
  "Deco",
  "Michael Ballack",
  "Miroslav Klose",
  "Lukas Podolski",
  "Henrik Larsson",
  "Nwankwo Kanu",
  "Jay-Jay Okocha",
  "Didier Drogba",
  "Michael Essien",
  "Florent Malouda",
  "Ashley Young",
  "James Milner",
  "Theo Walcott",
  "Aaron Ramsey",
  "Fernando Torres",
  "David Beckham",
  "Andriy Shevchenko",
  "Hernán Crespo",
  "Christian Vieri",
  "Patrick Kluivert",
  "Ruud van Nistelrooy",
  "Salomon Kalou",
  "Dimitar Berbatov",
  "Darren Bent",
  "Jermain Defoe",
  "Peter Crouch",
  "Emile Heskey",
  "Hatem Ben Arfa",
  "Frédéric Kanouté",
  "Yaya Touré",
  "Gervinho",
  "Nani (footballer)",
  "Robinho",
  "Ronaldinho",
  "Kaká",
  "Alexandre Pato",
  "Javier Saviola",
  "Pablo Aimar",
  "Diego Milito",
  "Juan Sebastián Verón",
  "Ezequiel Lavezzi",
  "Carlos Bacca",
  "Jackson Martínez",
  "Felipe Caicedo",
  "Loïc Rémy",
  "Bafétimbi Gomis",
  "Stevan Jovetić",
  "Bojan Krkić",
  "Giovani dos Santos",
  "Eiður Guðjohnsen",
  "John Carew",
  "Javier Mascherano",
  "Sulley Muntari",
  "Youri Djorkaeff",
  "Ludovic Giuly",
  "André Ayew",
  "Jordan Ayew",
  "Wilfried Bony",
  "Marouane Chamakh",
  "Klaas-Jan Huntelaar",
  "George Best",
  "Jürgen Klinsmann",
  "Luís Figo",
  "Rui Costa (footballer)",
  "Roberto Baggio",
  "Enzo Scifo",
  "Jean-Pierre Papin",
  "Gianluca Vialli",
  "Seydou Keita",
  "Ivan Rakitić",
  "Simão (footballer)",
  "Ricardo Carvalho",
  "Mateja Kežman",
  "Maxi Rodríguez",
  "Rodrigo Palacio",
];

const FLAG_ISO = {
  afghanistan: "AF",
  albania: "AL",
  algeria: "DZ",
  argentina: "AR",
  armenia: "AM",
  australia: "AU",
  austria: "AT",
  belgium: "BE",
  bolivia: "BO",
  "bosnia and herzegovina": "BA",
  brazil: "BR",
  bulgaria: "BG",
  "burkina faso": "BF",
  cameroon: "CM",
  canada: "CA",
  chile: "CL",
  china: "CN",
  "china pr": "CN",
  colombia: "CO",
  "costa rica": "CR",
  croatia: "HR",
  "côte d'ivoire": "CI",
  "cote d'ivoire": "CI",
  "ivory coast": "CI",
  "czech republic": "CZ",
  czechia: "CZ",
  denmark: "DK",
  "dr congo": "CD",
  "democratic republic of the congo": "CD",
  ecuador: "EC",
  egypt: "EG",
  england: "GB-ENG",
  finland: "FI",
  france: "FR",
  gabon: "GA",
  georgia: "GE",
  germany: "DE",
  ghana: "GH",
  greece: "GR",
  hungary: "HU",
  iceland: "IS",
  iran: "IR",
  iraq: "IQ",
  "republic of ireland": "IE",
  ireland: "IE",
  israel: "IL",
  italy: "IT",
  jamaica: "JM",
  japan: "JP",
  mali: "ML",
  mexico: "MX",
  montenegro: "ME",
  morocco: "MA",
  netherlands: "NL",
  "the netherlands": "NL",
  "new zealand": "NZ",
  nigeria: "NG",
  "north macedonia": "MK",
  macedonia: "MK",
  "northern ireland": "GB-NIR",
  norway: "NO",
  paraguay: "PY",
  peru: "PE",
  poland: "PL",
  portugal: "PT",
  romania: "RO",
  russia: "RU",
  scotland: "GB-SCT",
  senegal: "SN",
  serbia: "RS",
  "serbia and montenegro": "RS",
  slovakia: "SK",
  slovenia: "SI",
  "south africa": "ZA",
  "south korea": "KR",
  "korea republic": "KR",
  spain: "ES",
  sweden: "SE",
  switzerland: "CH",
  togo: "TG",
  tunisia: "TN",
  turkey: "TR",
  türkiye: "TR",
  ukraine: "UA",
  "united states": "US",
  usa: "US",
  uruguay: "UY",
  wales: "GB-WLS",
  zimbabwe: "ZW",
  "soviet union": "RU",
  yugoslavia: "RS",
  czechoslovakia: "CZ",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function obfuscate(text) {
  return Buffer.from(String(text), "utf8").toString("base64");
}

function fold(value) {
  return String(value)
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

function makeId(name) {
  return crypto.createHash("sha1").update(fold(name)).digest("hex").slice(0, 12);
}

function flagEmoji(nationality) {
  if (!nationality) return "";
  const iso = FLAG_ISO[fold(nationality).replace(/ø/g, "o")];
  if (!iso) return "";
  if (iso === "GB-ENG") return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
  if (iso === "GB-SCT") return "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
  if (iso === "GB-WLS") return "🏴󠁧󠁢󠁷󠁬󠁳󠁿";
  if (iso === "GB-NIR") return "🇬🇧";
  return [...iso].map((char) => String.fromCodePoint(0x1f1e6 - 65 + char.charCodeAt(0))).join("");
}

async function fetchJson(url, attempt = 0) {
  const response = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if ((response.status === 429 || response.status >= 500) && attempt < 6) {
    const retryAfter = Number(response.headers.get("retry-after"));
    const wait = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : 2500 * (attempt + 1);
    await sleep(wait);
    return fetchJson(url, attempt + 1);
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

async function fetchWikitext(title) {
  const url = new URL(API);
  url.searchParams.set("action", "parse");
  url.searchParams.set("page", title);
  url.searchParams.set("prop", "wikitext");
  url.searchParams.set("format", "json");
  url.searchParams.set("redirects", "1");
  const data = await fetchJson(url);
  if (data.error) {
    throw new Error(data.error.info || "Wikipedia parse error");
  }
  return {
    title: data.parse.title,
    wikitext: data.parse.wikitext["*"],
  };
}

async function fetchPhoto(title) {
  const url = new URL(API);
  url.searchParams.set("action", "query");
  url.searchParams.set("titles", title);
  url.searchParams.set("prop", "pageimages");
  url.searchParams.set("pithumbsize", "640");
  url.searchParams.set("format", "json");
  url.searchParams.set("redirects", "1");
  const data = await fetchJson(url);
  const pages = data.query?.pages || {};
  const page = Object.values(pages)[0];
  return toThumb(page?.thumbnail?.source || "");
}

/** Prefer a 640px Wikimedia thumbnail so phones are not sent full-size photos. */
function toThumb(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    parsed.search = "";
    if (parsed.pathname.includes("/thumb/")) return parsed.toString();
    const match = parsed.pathname.match(/\/wikipedia\/((?:commons|[a-z]{2}))\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+)$/i);
    if (!match) return parsed.toString();
    const [, project, hash, file] = match;
    return `https://upload.wikimedia.org/wikipedia/${project}/thumb/${hash}/${file}/640px-${file}`;
  } catch {
    return url;
  }
}

function findMatching(source, start, open, close) {
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source.startsWith(open, i)) {
      depth += 1;
      i += open.length - 1;
    } else if (source.startsWith(close, i)) {
      depth -= 1;
      if (depth === 0) return i + close.length - 1;
      i += close.length - 1;
    }
  }
  return -1;
}

function extractTemplate(wikitext, names) {
  const pattern = new RegExp(`\\{\\{\\s*(?:${names.join("|")})\\b`, "i");
  const match = pattern.exec(wikitext);
  if (!match) return null;
  const end = findMatching(wikitext, match.index, "{{", "}}");
  if (end === -1) return null;
  return wikitext.slice(match.index, end + 1);
}

function splitTopLevel(source, delimiter) {
  const parts = [];
  let current = "";
  let curly = 0;
  let square = 0;
  for (let i = 0; i < source.length; i++) {
    if (source.startsWith("{{", i)) {
      curly += 1;
      current += "{{";
      i += 1;
      continue;
    }
    if (source.startsWith("}}", i)) {
      curly = Math.max(0, curly - 1);
      current += "}}";
      i += 1;
      continue;
    }
    if (source.startsWith("[[", i)) {
      square += 1;
      current += "[[";
      i += 1;
      continue;
    }
    if (source.startsWith("]]", i)) {
      square = Math.max(0, square - 1);
      current += "]]";
      i += 1;
      continue;
    }
    if (source[i] === delimiter && curly === 0 && square === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += source[i];
  }
  parts.push(current);
  return parts;
}

function parseTemplate(template) {
  const inner = template.replace(/^\{\{/, "").replace(/\}\}$/, "");
  const parts = splitTopLevel(inner, "|");
  const params = {};
  parts.slice(1).forEach((part) => {
    const eq = (() => {
      let curly = 0;
      let square = 0;
      for (let i = 0; i < part.length; i++) {
        if (part.startsWith("{{", i)) {
          curly += 1;
          i += 1;
          continue;
        }
        if (part.startsWith("}}", i)) {
          curly = Math.max(0, curly - 1);
          i += 1;
          continue;
        }
        if (part.startsWith("[[", i)) {
          square += 1;
          i += 1;
          continue;
        }
        if (part.startsWith("]]", i)) {
          square = Math.max(0, square - 1);
          i += 1;
          continue;
        }
        if (part[i] === "=" && curly === 0 && square === 0) return i;
      }
      return -1;
    })();
    if (eq === -1) return;
    const key = part.slice(0, eq).trim().toLowerCase();
    params[key] = part.slice(eq + 1).trim();
  });
  return params;
}

function stripRefs(value) {
  return value
    .replace(/<ref\b[^>]*\/>/gi, "")
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

function replaceLinks(source) {
  let out = "";
  for (let i = 0; i < source.length; i++) {
    if (source.startsWith("[[", i)) {
      const end = source.indexOf("]]", i + 2);
      if (end === -1) {
        out += source[i];
        continue;
      }
      const inner = source.slice(i + 2, end);
      if (/^(file|image):/i.test(inner)) {
        i = end + 1;
        continue;
      }
      const pipe = inner.indexOf("|");
      const text = (pipe >= 0 ? inner.slice(pipe + 1) : inner).replace(/_/g, " ");
      out += text;
      i = end + 1;
    } else {
      out += source[i];
    }
  }
  return out;
}

function stripTemplates(source) {
  let out = "";
  for (let i = 0; i < source.length; i++) {
    if (source.startsWith("{{", i)) {
      const end = findMatching(source, i, "{{", "}}");
      if (end === -1) {
        out += source[i];
        continue;
      }
      i = end;
    } else {
      out += source[i];
    }
  }
  return out;
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&ndash;|&#8211;|&#x2013;/gi, "–")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

function cleanInline(raw) {
  if (!raw) return "";
  let text = stripRefs(raw);
  text = replaceLinks(text);
  text = stripTemplates(text);
  text = decodeEntities(text);
  text = text.replace(/<br\s*\/?>/gi, " / ").replace(/<[^>]+>/g, "");
  text = text.replace(/'{2,}/g, "");
  return text.replace(/\s+/g, " ").trim();
}

function parseNumber(raw) {
  const text = cleanInline(raw).replace(/,/g, "");
  if (!text) return null;
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function parseBirthYear(raw) {
  const text = stripRefs(raw || "");
  const match = text.match(/\b(19\d{2}|20\d{2})\b/);
  if (!match) return null;
  const year = Number(match[1]);
  return year >= 1940 && year <= 2012 ? year : null;
}

function tidyYears(raw) {
  const text = cleanInline(raw)
    .replace(/\s*[—–-]\s*/g, "–")
    .replace(/\s+/g, "")
    .replace(/–+/g, "–");
  return text;
}

function tidyClub(raw) {
  const loan = /loan/i.test(raw) || /→|➞|&rarr;|&#8594;/i.test(raw);
  let text = cleanInline(raw);
  text = text
    .replace(/\s*\((?:on )?loan\)/gi, "")
    .replace(/^[→➞>\s]+/, "")
    .replace(/\s+(F\.C\.|FC|A\.F\.C\.|AFC|C\.F\.|CF|S\.K\.)$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return { team: text, isLoan: loan };
}

function tidyPosition(raw) {
  const text = cleanInline(raw)
    .split(/\s*(?:\/|,|;|\|)\s*/)
    .map((part) => part.trim())
    .filter((part) => part && part.length < 40 && !/[{}[\]]/.test(part));
  const unique = [];
  text.forEach((part) => {
    const label = part.charAt(0).toUpperCase() + part.slice(1);
    if (!unique.some((item) => fold(item) === fold(label))) unique.push(label);
  });
  return unique.slice(0, 3).join(" / ");
}

function countryFromTeam(team) {
  let name = cleanInline(team);
  name = name
    .replace(/\b(men's|women's|olympic|national|football|soccer|association)\b/gi, " ")
    .replace(/\b(team|under[-\s]?\d+|u[-\s]?\d+)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return name;
}

function isReserveSide(team) {
  return /\b(II|III|reserves?|youth)\b/i.test(team) || /^jong\b/i.test(team);
}

function isYouthSide(team) {
  return /\b(u[-\s]?\d+|under[-\s]?\d+|olympic|youth|amateur|b team)\b/i.test(team);
}

function maskPlayer(text, names) {
  let out = text;
  const sorted = [...names].filter((name) => name && name.length >= 4).sort((a, b) => b.length - a.length);
  sorted.forEach((name) => {
    const pattern = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
    out = out.replace(pattern, "");
  });
  return out.replace(/\s{2,}/g, " ").replace(/\s+([,.)])/g, "$1").trim();
}

function careerFromParams(params) {
  const rows = [];
  for (let i = 1; i <= 40; i += 1) {
    const yearsRaw = params[`years${i}`];
    const clubsRaw = params[`clubs${i}`];
    if (!yearsRaw && !clubsRaw) continue;
    const years = tidyYears(yearsRaw || "");
    const { team, isLoan } = tidyClub(clubsRaw || "");
    if (!team || /national team/i.test(team) || isReserveSide(team)) continue;
    rows.push({
      years,
      team,
      apps: parseNumber(params[`caps${i}`]),
      goals: parseNumber(params[`goals${i}`]),
      isLoan,
    });
  }
  return rows;
}

function internationalsFromParams(params) {
  const rows = [];
  for (let i = 1; i <= 16; i += 1) {
    const teamRaw = params[`nationalteam${i}`];
    if (!teamRaw) continue;
    const label = cleanInline(teamRaw);
    if (!label || isYouthSide(label)) continue;
    rows.push({
      team: countryFromTeam(label),
      caps: parseNumber(params[`nationalcaps${i}`]),
      goals: parseNumber(params[`nationalgoals${i}`]),
    });
  }
  rows.sort((a, b) => (b.caps || 0) - (a.caps || 0));
  return rows[0] || null;
}

function clubStatus(currentRaw, career) {
  const current = tidyClub(currentRaw || "").team;
  const nonClub = !current || /national team|head coach|manager|coach|retired|free agent/i.test(currentRaw || "");
  if (!nonClub && current) {
    return { club: current, clubLabel: "current" };
  }
  const last = [...career].reverse().find((row) => !row.isLoan && row.team) || career[career.length - 1];
  return { club: last?.team || "", clubLabel: "last" };
}

function buildPlayer(pageTitle, wikitext, photo) {
  const template = extractTemplate(wikitext, [
    "Infobox football biography",
    "Infobox Football biography",
    "Infobox football personal information",
  ]);
  if (!template) {
    return { error: "No football infobox found" };
  }
  const params = parseTemplate(template);
  const name = cleanInline(params.name || "") || pageTitle.replace(/\s+\([^)]*\)$/, "");
  const fullName = cleanInline(params.fullname || params.full_name || "");
  const aliases = [];
  if (fullName && fold(fullName) !== fold(name)) aliases.push(fullName);
  const folded = fold(name);
  if (folded !== name.toLowerCase()) aliases.push(folded.replace(/\b\w/g, (char) => char.toUpperCase()));

  const career = careerFromParams(params);
  const intl = internationalsFromParams(params);
  const birthYear = parseBirthYear(params.birth_date || params.birthdate || "");
  const position = tidyPosition(params.position || "");
  const nationality = intl?.team || "";
  const { club, clubLabel } = clubStatus(params.currentclub || "", career);
  const namesToMask = [name, fullName, pageTitle.replace(/\s+\([^)]*\)$/, "")];

  const safeCareer = career.map((row) => ({
    ...row,
    team: maskPlayer(row.team, namesToMask) || row.team,
  }));
  const safeClub = maskPlayer(club, namesToMask) || club;

  const totalApps = safeCareer.reduce((sum, row) => sum + (row.apps || 0), 0);

  return {
    player: {
      id: makeId(name),
      name: obfuscate(name),
      aliases: aliases.map(obfuscate),
      photo: obfuscate(photo || ""),
      nationality,
      flag: flagEmoji(nationality),
      position,
      birthYear,
      club: safeClub,
      clubLabel,
      caps: intl?.caps ?? 0,
      intlGoals: intl?.goals ?? 0,
      career: safeCareer,
    },
    plain: { name, totalApps, photo: Boolean(photo), career: safeCareer },
  };
}

function review(entry, plain) {
  const issues = [];
  const { career } = entry;
  if (!plain.name) issues.push("missing name");
  if (!plain.photo) issues.push("missing photo");
  if (!entry.nationality) issues.push("missing nationality");
  else if (!entry.flag) issues.push(`no flag mapping for ${entry.nationality}`);
  if (!entry.position) issues.push("missing position");
  if (!entry.birthYear) issues.push("missing birth year");
  if (entry.caps == null) issues.push("missing international caps");
  if (!entry.club) issues.push("missing current/last club");
  if (career.length < 3) issues.push(`only ${career.length} senior club row(s)`);
  career.forEach((row, index) => {
    if (!row.years) issues.push(`row ${index + 1} missing years`);
    if (!row.team) issues.push(`row ${index + 1} missing team`);
    if (row.apps == null) issues.push(`row ${index + 1} (${row.team || "team"}) missing apps`);
    if (row.goals == null) issues.push(`row ${index + 1} (${row.team || "team"}) missing goals`);
    if (row.apps != null && row.goals != null && row.goals > row.apps) {
      issues.push(`row ${index + 1} (${row.team}) has more goals than apps`);
    }
    if (/[{}[\]<>]/.test(row.team) || /[{}[\]<>]/.test(row.years)) {
      issues.push(`row ${index + 1} still has wiki markup`);
    }
  });
  if (plain.totalApps < 40) issues.push(`low total apps (${plain.totalApps})`);
  return issues;
}

async function buildOne(requested) {
  const { title, wikitext } = await fetchWikitext(requested);
  await sleep(120);
  await sleep(400);
  const photo = await fetchPhoto(title);
  const built = buildPlayer(title, wikitext, photo);
  if (built.error) {
    return { requested, title, error: built.error };
  }
  const issues = review(built.player, built.plain);
  const fatal = issues.some((issue) =>
    /missing name|only [01] senior|no football|low total apps \(0\)/.test(issue)
  );
  return {
    requested,
    title,
    player: built.player,
    plainName: built.plain.name,
    issues,
    fatal: fatal || built.plain.career.length < 2,
  };
}

function writeReport(results) {
  const included = results.filter((item) => item.player && !item.fatal);
  const excluded = results.filter((item) => !item.player || item.fatal);
  const warned = included.filter((item) => item.issues.length);
  const lines = [
    "# Journeyman player build report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `- Requested: ${results.length}`,
    `- Included: ${included.length}`,
    `- Excluded: ${excluded.length}`,
    `- Included with warnings: ${warned.length}`,
    "",
    "Names below are for manual data checking. The game file stores names as base64.",
    "",
  ];
  if (excluded.length) {
    lines.push("## Excluded", "");
    excluded.forEach((item) => {
      const reason = item.error || item.issues.join("; ") || "unusable record";
      lines.push(`- ${item.requested}${item.title && item.title !== item.requested ? ` (page: ${item.title})` : ""}: ${reason}`);
    });
    lines.push("");
  }
  if (warned.length) {
    lines.push("## Included with warnings", "");
    warned.forEach((item) => {
      lines.push(`- ${item.plainName}: ${item.issues.join("; ")}`);
    });
    lines.push("");
  }
  const clean = included.filter((item) => item.issues.length === 0);
  lines.push("## Clean", "");
  if (!clean.length) lines.push("- None");
  clean.forEach((item) => {
    const clubs = item.player.career.length;
    lines.push(`- ${item.plainName}: ${clubs} senior rows, ${item.player.nationality}, born ${item.player.birthYear}`);
  });
  lines.push("");
  fs.writeFileSync(REPORT_PATH, lines.join("\n"));
}

async function main() {
  const append = process.argv.includes("--append");
  const requested = process.argv.slice(2).filter((arg) => arg !== "--append");
  const names = requested.length ? requested : SEED_PLAYERS;
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  const results = [];
  for (let i = 0; i < names.length; i += 1) {
    const name = names[i];
    process.stdout.write(`[${i + 1}/${names.length}] ${name} ... `);
    try {
      const result = await buildOne(name);
      results.push(result);
      if (!result.player || result.fatal) {
        console.log(`EXCLUDED (${result.error || result.issues[0] || "unusable"})`);
      } else if (result.issues.length) {
        console.log(`ok, ${result.issues.length} warning(s)`);
      } else {
        console.log("ok");
      }
    } catch (error) {
      console.log(`FAILED (${error.message})`);
      results.push({ requested: name, error: error.message });
    }
    await sleep(900);
  }

  const seen = new Set();
  const players = [];
  if (append && fs.existsSync(DATA_PATH)) {
    JSON.parse(fs.readFileSync(DATA_PATH, "utf8")).forEach((player) => {
      if (player?.id && !seen.has(player.id)) {
        seen.add(player.id);
        players.push(player);
      }
    });
  }
  results.forEach((result) => {
    if (!result.player || result.fatal) return;
    if (seen.has(result.player.id)) {
      result.fatal = true;
      result.issues = [...(result.issues || []), "duplicate id"];
      return;
    }
    seen.add(result.player.id);
    players.push(result.player);
  });

  fs.writeFileSync(DATA_PATH, `${JSON.stringify(players, null, 2)}\n`);
  if (append && fs.existsSync(REPORT_PATH)) {
    fs.appendFileSync(REPORT_PATH, `\n## Appended ${new Date().toISOString()}\n\n${results.map((item) => {
      if (!item.player || item.fatal) return `- EXCLUDED ${item.requested}: ${item.error || (item.issues || []).join("; ")}`;
      return `- ADDED ${item.plainName}${item.issues?.length ? ` (${item.issues.join("; ")})` : ""}`;
    }).join("\n")}\n`);
  } else {
    writeReport(results);
  }
  console.log(`\nWrote ${players.length} players to ${path.relative(ROOT, DATA_PATH)}`);
  console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
