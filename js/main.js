/**
 * Journeyman boot. Wires the daily trio, saved progress, and the screens.
 * The answer is never written into the title, the URL, or the DOM until
 * that round has already been won or lost.
 */

import { footerVersion } from "./version.js";
import { deobfuscate, fold } from "./text.js";
import {
  formatCountdown,
  getLondonDateString,
  msUntilLondonMidnight,
  puzzleNumberFor,
  selectDailyIds,
} from "./daily.js";
import {
  allRoundsFinished,
  applyGuess,
  careerTotal,
  clueCards,
  cluesUnlocked,
  createProgress,
  emptyRound,
  guessCounter,
  guessDots,
  resultMessage,
  searchPlayers,
  shareRow,
  visibleCareer,
} from "./game.js";
import {
  effectiveStreak,
  hasSeenHowTo,
  loadProgress,
  loadStats,
  markHowToSeen,
  recordCompletion,
  saveProgress,
  saveStats,
  winRate,
} from "./storage.js";
import { buildShareText, shareResult } from "./share.js";
import {
  announce,
  burstConfetti,
  closeModal,
  openHowTo,
  openStats,
  renderError,
  renderLoading,
  renderPlay,
  renderResults,
  setCountdown,
  setStreak,
  setTaglineVisible,
  setVersionLabel,
  shakeCareer,
  shakeGuess,
  showFeedback,
  showToast,
} from "./ui.js";

const state = {
  pool: [],
  byId: new Map(),
  today: "",
  stats: null,
  progress: null,
};

document.querySelector("#stats-btn").addEventListener("click", () => {
  openStats(statsModel());
});
document.querySelector("#help-btn").addEventListener("click", () => {
  openHowTo(() => markHowToSeen());
});

boot();

async function boot() {
  setVersionLabel(footerVersion());
  renderLoading();
  state.today = getLondonDateString();
  state.stats = loadStats();
  refreshStreak();
  try {
    const response = await fetch(new URL("../data/players.json", import.meta.url));
    if (!response.ok) throw new Error("Could not load players");
    const raw = await response.json();
    state.pool = raw.map(hydrate).filter((player) => player.name && player.career.length);
    state.byId = new Map(state.pool.map((player) => [player.id, player]));
  } catch (error) {
    console.error(error);
    renderError();
    return;
  }
  if (state.pool.length < 3) {
    renderError();
    return;
  }
  beginDay();
  if (!hasSeenHowTo()) openHowTo(() => markHowToSeen());
  window.setInterval(tickClock, 1000);
}

function hydrate(raw) {
  return {
    id: raw.id,
    name: deobfuscate(raw.name),
    aliases: (raw.aliases || []).map((alias) => deobfuscate(alias)).filter(Boolean),
    photo: deobfuscate(raw.photo),
    nationality: raw.nationality || "",
    flag: raw.flag || "",
    position: raw.position || "",
    birthYear: raw.birthYear || null,
    club: raw.club || "",
    clubLabel: raw.clubLabel === "current" ? "current" : "last",
    caps: Number.isFinite(raw.caps) ? raw.caps : 0,
    intlGoals: Number.isFinite(raw.intlGoals) ? raw.intlGoals : 0,
    career: Array.isArray(raw.career) ? raw.career : [],
  };
}

function beginDay() {
  const saved = loadProgress();
  if (saved && saved.date === state.today && saved.playerIds.every((id) => state.byId.has(id))) {
    state.progress = normaliseProgress(saved);
  } else {
    const ids = selectDailyIds(state.pool.map((player) => player.id).sort(), puzzleNumberFor(state.today));
    state.progress = createProgress(state.today, puzzleNumberFor(state.today), ids);
    saveProgress(state.progress);
  }
  if (state.progress.completed || allRoundsFinished(state.progress)) {
    commitStats();
    showResults();
    return;
  }
  showPlay(false);
}

function normaliseProgress(saved) {
  return {
    ...saved,
    index: Math.min(Math.max(saved.index || 0, 0), 2),
    completed: Boolean(saved.completed),
    rounds: saved.rounds.map((round) => ({
      guesses: Array.isArray(round.guesses) ? round.guesses : [],
      status: round.status === "won" || round.status === "lost" ? round.status : "playing",
      guessesUsed: round.guessesUsed || (round.guesses ? round.guesses.length : 0),
    })),
  };
}

function currentPlayer() {
  return state.byId.get(state.progress.playerIds[state.progress.index]);
}

function showPlay(focusGuess) {
  const progress = state.progress;
  const round = progress.rounds[progress.index] || emptyRound();
  const player = currentPlayer();
  const over = round.status === "won" || round.status === "lost";
  const career = visibleCareer(player);
  setTaglineVisible(progress.index === 0 && round.guesses.length === 0 && !over);
  renderPlay({
    playerNumber: progress.index + 1,
    playerCount: 3,
    counter: guessCounter(round),
    dots: guessDots(round),
    segments: progress.rounds.map((item, index) => {
      if (item.status === "won") return "won";
      if (item.status === "lost") return "lost";
      if (index === progress.index) return "current";
      return "upcoming";
    }),
    career,
    totals: careerTotal(career),
    clues: clueCards(player, cluesUnlocked(round)),
    wrongs: round.guesses.map((guess) => guess.name),
    shake: false,
    focusGuess: focusGuess && !over,
    reveal: over
      ? {
        name: player.name,
        photo: player.photo,
        won: round.status === "won",
        message: resultMessage(round),
        emoji: shareRow(round),
        nextLabel: progress.index === 2 ? "See results" : "Next player",
      }
      : null,
  }, {
    search: (query) => searchPlayers(state.pool, query, 6),
    sameName: (candidate, typed) => fold(candidate.name) === fold(typed)
      || candidate.aliases.some((alias) => fold(alias) === fold(typed)),
    onGuess: (guess) => takeGuess(guess),
    onNext: advance,
  });
}

function takeGuess(guess) {
  const progress = state.progress;
  const answer = currentPlayer();
  const outcome = applyGuess(progress.rounds[progress.index], guess.id, guess.name, answer.id);
  if (outcome.result === "duplicate") {
    showFeedback("You already tried that name");
    shakeGuess();
    announce(`${guess.name} was already guessed.`);
    return;
  }
  if (outcome.result === "closed") return;
  progress.rounds[progress.index] = outcome.round;
  const finishedDay = allRoundsFinished(progress);
  if (finishedDay) progress.completed = true;
  saveProgress(progress);
  if (finishedDay) commitStats();

  if (outcome.result === "win") {
    showPlay(false);
    burstConfetti();
    announce(`${resultMessage(outcome.round)} It was ${answer.name}.`);
    return;
  }
  if (outcome.result === "wrong") {
    showPlay(true);
    shakeCareer();
    const unlocked = cluesUnlocked(outcome.round);
    announce(`Not ${guess.name}. Clue ${unlocked} unlocked.`);
    return;
  }
  showPlay(false);
  announce(`${resultMessage(outcome.round)} It was ${answer.name}.`);
}

function advance() {
  const progress = state.progress;
  if (progress.index >= 2 || allRoundsFinished(progress)) {
    progress.completed = true;
    saveProgress(progress);
    commitStats();
    showResults();
    announce("Results for today.");
    return;
  }
  progress.index += 1;
  saveProgress(progress);
  showPlay(false);
  announce(`Player ${progress.index + 1} of 3.`);
  document.querySelector("#app").focus();
}

function showResults() {
  const progress = state.progress;
  setTaglineVisible(false);
  const rows = progress.playerIds.map((id, index) => {
    const player = state.byId.get(id);
    const round = progress.rounds[index];
    return {
      name: player.name,
      photo: player.photo,
      summary: round.status === "won" ? `Solved in ${round.guessesUsed}` : "Not this time",
      emoji: shareRow(round),
    };
  });
  renderResults({
    puzzle: progress.puzzle,
    countdown: formatCountdown(msUntilLondonMidnight()),
    shareText: currentShareText(),
    rows,
  }, { onShare: shareToday });
}

async function shareToday() {
  const outcome = await shareResult(currentShareText());
  if (outcome === "copied") showToast("Copied!");
  else if (outcome === "failed") showToast("Couldn't copy. Try again.");
}

function currentShareText() {
  return buildShareText({
    puzzle: state.progress.puzzle,
    streak: effectiveStreak(state.stats, state.today),
    rounds: state.progress.rounds,
    url: `${location.origin}${location.pathname}`,
  });
}

function commitStats() {
  if (!state.progress || !allRoundsFinished(state.progress)) return;
  state.progress.completed = true;
  state.stats = recordCompletion(state.stats, state.today, state.progress.rounds);
  saveStats(state.stats);
  saveProgress(state.progress);
  refreshStreak();
}

function refreshStreak() {
  setStreak(effectiveStreak(state.stats, state.today));
}

function statsModel() {
  const buckets = [];
  if (state.progress && allRoundsFinished(state.progress) && state.progress.date === state.today) {
    state.progress.rounds.forEach((round) => {
      buckets.push(round.status === "won" ? round.guessesUsed : "lost");
    });
  }
  return {
    streak: effectiveStreak(state.stats, state.today),
    best: state.stats.bestStreak || 0,
    played: state.stats.gamesPlayed || 0,
    winRate: winRate(state.stats),
    distribution: state.stats.distribution,
    todayBuckets: buckets,
  };
}

function tickClock() {
  setCountdown(formatCountdown(msUntilLondonMidnight()));
  const today = getLondonDateString();
  if (today === state.today) return;
  state.today = today;
  closeModal();
  beginDay();
}
