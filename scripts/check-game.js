/**
 * Sanity checks for the pure game rules. Run with: node scripts/check-game.js
 */

import fs from "fs";
import assert from "node:assert/strict";
import { footerVersion, VERSION } from "../js/version.js";
import { deobfuscate, fold, maskNames } from "../js/text.js";
import {
  addDays,
  formatCountdown,
  msUntilLondonMidnight,
  puzzleNumberFor,
  selectDailyIds,
} from "../js/daily.js";
import {
  applyGuess,
  clueCards,
  cluesUnlocked,
  emptyRound,
  searchPlayers,
  shareRow,
} from "../js/game.js";
import { buildShareText } from "../js/share.js";
import {
  effectiveStreak,
  emptyStats,
  recordCompletion,
  winRate,
} from "../js/storage.js";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

check("version label", () => {
  assert.equal(VERSION, "1.0.0");
  assert.equal(footerVersion(), "v1.0");
});

check("accent folding", () => {
  assert.equal(fold("Mesut Özil"), fold("mesut ozil"));
  assert.equal(fold("Eiður"), "eidur");
});

check("base64 round trip", () => {
  const encoded = Buffer.from("Mesut Özil", "utf8").toString("base64");
  assert.equal(deobfuscate(encoded), "Mesut Özil");
});

check("name masking", () => {
  assert.equal(maskNames("Goals by Robin van Persie", ["Robin van Persie"]), "Goals by");
});

check("puzzle 42 on 2 Oct 2026", () => {
  assert.equal(puzzleNumberFor("2026-10-02"), 42);
  assert.equal(puzzleNumberFor("2026-08-22"), 1);
  assert.equal(addDays("2026-10-02", -1), "2026-10-01");
});

check("countdown stays inside a day", () => {
  const ms = msUntilLondonMidnight(new Date("2026-10-02T12:00:00Z"));
  assert.ok(ms > 0 && ms <= 86400000);
  assert.match(formatCountdown(3661000), /^\d{2}:\d{2}:\d{2}$/);
  assert.equal(formatCountdown(3661000), "01:01:01");
});

check("daily trio is stable and does not repeat early", () => {
  const ids = Array.from({ length: 12 }, (_, index) => `p${index}`);
  const first = selectDailyIds(ids, 42);
  assert.deepEqual(first, selectDailyIds(ids, 42));
  assert.equal(new Set(first).size, 3);
  const seen = new Set();
  for (let day = 1; day <= 4; day += 1) {
    selectDailyIds(ids, day).forEach((id) => {
      assert.equal(seen.has(id), false);
      seen.add(id);
    });
  }
  assert.equal(seen.size, 12);
});

check("search ignores accents and caps the list", () => {
  const pool = [
    { name: "Mesut Özil", aliases: ["Mesut Ozil"] },
    { name: "Olivier Giroud", aliases: [] },
    { name: "Luis Suárez", aliases: [] },
  ];
  const hits = searchPlayers(pool, "ozil", 6);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].name, "Mesut Özil");
  assert.equal(searchPlayers(pool, "", 6).length, 0);
});

check("guesses unlock clues and stop at five", () => {
  let round = emptyRound();
  const wrong = applyGuess(round, "nope", "Someone", "answer");
  assert.equal(wrong.result, "wrong");
  assert.equal(cluesUnlocked(wrong.round), 1);
  round = wrong.round;
  assert.equal(applyGuess(round, "nope", "Someone", "answer").result, "duplicate");
  for (let guess = 0; guess < 3; guess += 1) {
    round = applyGuess(round, `g${guess}`, `Name ${guess}`, "answer").round;
  }
  assert.equal(cluesUnlocked(round), 4);
  assert.equal(round.status, "playing");
  const loss = applyGuess(round, "last", "Last", "answer");
  assert.equal(loss.result, "loss");
  assert.equal(shareRow(loss.round), "🟥🟥🟥🟥🟥");
  const win = applyGuess(emptyRound(), "answer", "Star", "answer");
  assert.equal(win.result, "win");
  assert.equal(shareRow(win.round), "🟩⬜⬜⬜⬜");
  const later = applyGuess(
    { guesses: [{ id: "a", name: "A" }, { id: "b", name: "B" }], status: "playing", guessesUsed: 2 },
    "answer",
    "Star",
    "answer"
  );
  assert.equal(shareRow(later.round), "🟥🟥🟩⬜⬜");
});

check("clue order", () => {
  const player = {
    name: "Hidden",
    aliases: [],
    flag: "🇳🇱",
    nationality: "Netherlands",
    position: "Striker",
    caps: 10,
    intlGoals: 4,
    birthYear: 1983,
    club: "Feyenoord",
    clubLabel: "last",
  };
  const cards = clueCards(player, 1);
  assert.equal(cards[0].state, "open");
  assert.match(cards[0].text, /Netherlands/);
  assert.equal(cards[1].state, "next");
  assert.match(cards[1].text, /Clue 2 unlocks after your next wrong guess/);
  assert.equal(cards[3].state, "locked");
  const all = clueCards(player, 4);
  assert.match(all[3].text, /1980s/);
  assert.match(all[3].text, /Last club: Feyenoord/);
});

check("share text has no player names", () => {
  const rounds = [
    { status: "won", guessesUsed: 3 },
    { status: "won", guessesUsed: 1 },
    { status: "lost", guessesUsed: 5 },
  ];
  const text = buildShareText({
    puzzle: 42,
    streak: 5,
    rounds,
    url: "https://example.com/",
  });
  assert.equal(
    text,
    [
      "Journeyman #42 🔥 Streak: 5",
      "Player 1: 🟥🟥🟩⬜⬜",
      "Player 2: 🟩⬜⬜⬜⬜",
      "Player 3: 🟥🟥🟥🟥🟥",
      "https://example.com/",
    ].join("\n")
  );
  assert.doesNotMatch(text, /Özil|Persie|Bellamy/i);
});

check("streak resets after a missed day and win rate is per player", () => {
  let stats = emptyStats();
  stats = recordCompletion(stats, "2026-10-01", [
    { status: "won", guessesUsed: 1 },
    { status: "won", guessesUsed: 2 },
    { status: "lost", guessesUsed: 5 },
  ]);
  assert.equal(effectiveStreak(stats, "2026-10-01"), 1);
  assert.equal(effectiveStreak(stats, "2026-10-02"), 1);
  assert.equal(effectiveStreak(stats, "2026-10-03"), 0);
  const again = recordCompletion(stats, "2026-10-01", [
    { status: "won", guessesUsed: 1 },
    { status: "lost", guessesUsed: 5 },
    { status: "lost", guessesUsed: 5 },
  ]);
  assert.equal(again.gamesPlayed, 1);
  stats = recordCompletion(stats, "2026-10-02", [
    { status: "won", guessesUsed: 5 },
    { status: "won", guessesUsed: 4 },
    { status: "won", guessesUsed: 3 },
  ]);
  assert.equal(stats.currentStreak, 2);
  assert.equal(stats.bestStreak, 2);
  assert.equal(stats.distribution[0], 1);
  assert.equal(stats.distribution[4], 1);
  assert.equal(stats.distribution[5], 1);
  assert.equal(winRate(stats), 83);
  const afterGap = recordCompletion(stats, "2026-10-05", [
    { status: "lost", guessesUsed: 5 },
    { status: "lost", guessesUsed: 5 },
    { status: "lost", guessesUsed: 5 },
  ]);
  assert.equal(afterGap.currentStreak, 1);
  assert.equal(afterGap.bestStreak, 2);
});

const dataPath = new URL("../data/players.json", import.meta.url);
if (fs.existsSync(dataPath)) {
  check("player file keeps names unreadable at a glance", () => {
    const rawText = fs.readFileSync(dataPath, "utf8");
    const players = JSON.parse(rawText);
    assert.ok(players.length >= 3);
    players.forEach((player) => {
      assert.match(player.name, /^[A-Za-z0-9+/]+=*$/);
      assert.match(player.photo, /^[A-Za-z0-9+/]+=*$/);
      const name = deobfuscate(player.name);
      assert.ok(name.length > 1);
      assert.equal(rawText.includes(`"${name}"`), false);
      assert.ok(player.career.length >= 1);
    });
  });
}

console.log(`\n${passed} checks passed`);
