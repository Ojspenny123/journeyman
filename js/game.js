/**
 * Pure round rules: search, guesses, clue unlocks, and result copy.
 * Five guesses. Each wrong guess unlocks the next clue, so four wrong
 * guesses reveal every clue and the fifth wrong guess ends the round.
 */

import { decadeLabel, fold, maskNames, plural } from "./text.js";

export const GUESSES_PER_PLAYER = 5;
export const CLUE_COUNT = 4;

export function emptyRound() {
  return { guesses: [], status: "playing", guessesUsed: 0 };
}

export function createProgress(date, puzzle, playerIds) {
  return {
    date,
    puzzle,
    playerIds,
    index: 0,
    completed: false,
    rounds: playerIds.map(() => emptyRound()),
  };
}

export function isRoundOver(round) {
  return round.status === "won" || round.status === "lost";
}

export function cluesUnlocked(round) {
  return Math.min(CLUE_COUNT, round.guesses.length);
}

export function searchPlayers(pool, query, limit = 6) {
  const needle = fold(query);
  if (!needle) return [];
  const scored = [];
  pool.forEach((player) => {
    const fields = [player.name, ...(player.aliases || [])];
    let rank = 0;
    fields.forEach((field) => {
      const haystack = fold(field);
      if (!haystack.includes(needle)) return;
      if (haystack === needle) rank = Math.max(rank, 4);
      else if (haystack.startsWith(needle)) rank = Math.max(rank, 3);
      else if (haystack.split(/\s+/).some((word) => word.startsWith(needle))) rank = Math.max(rank, 2);
      else rank = Math.max(rank, 1);
    });
    if (rank) scored.push({ player, rank });
  });
  scored.sort((a, b) => b.rank - a.rank || a.player.name.localeCompare(b.player.name));
  return scored.slice(0, limit).map((item) => item.player);
}

export function applyGuess(round, guessId, guessName, answerId) {
  if (isRoundOver(round)) {
    return { round, result: "closed" };
  }
  if (round.guesses.some((guess) => guess.id === guessId)) {
    return { round, result: "duplicate" };
  }
  if (guessId === answerId) {
    return {
      result: "win",
      round: {
        guesses: round.guesses,
        status: "won",
        guessesUsed: round.guesses.length + 1,
      },
    };
  }
  const guesses = [...round.guesses, { id: guessId, name: guessName }];
  const lost = guesses.length >= GUESSES_PER_PLAYER;
  return {
    result: lost ? "loss" : "wrong",
    round: {
      guesses,
      status: lost ? "lost" : "playing",
      guessesUsed: guesses.length,
    },
  };
}

export function careerTotal(career) {
  return career.reduce(
    (total, row) => ({
      apps: total.apps + (Number.isFinite(row.apps) ? row.apps : 0),
      goals: total.goals + (Number.isFinite(row.goals) ? row.goals : 0),
    }),
    { apps: 0, goals: 0 }
  );
}

export function visibleCareer(player) {
  const names = [player.name, ...(player.aliases || [])];
  return player.career.map((row) => ({
    ...row,
    team: maskNames(row.team, names) || "Club",
    years: maskNames(row.years, names),
  }));
}

export function clueCards(player, unlocked) {
  const decade = decadeLabel(player.birthYear);
  const clubWord = player.clubLabel === "current" ? "Current club" : "Last club";
  const caps = Number.isFinite(player.caps) ? player.caps : 0;
  const goals = Number.isFinite(player.intlGoals) ? player.intlGoals : 0;
  const definitions = [
    {
      key: "nation",
      kicker: "Nationality",
      tint: "blue",
      text: player.flag ? `${player.flag}  ${player.nationality}` : player.nationality || "Unknown",
    },
    {
      key: "position",
      kicker: "Position",
      tint: "green",
      text: player.position || "Unknown",
    },
    {
      key: "caps",
      kicker: "International",
      tint: "purple",
      text: caps === 0 ? "No senior international caps" : `${plural(caps, "cap")}, ${plural(goals, "goal")}`,
    },
    {
      key: "club",
      kicker: "Born & club",
      tint: "yellow",
      text: `Born in the ${decade} · ${clubWord}: ${maskNames(player.club, [player.name, ...(player.aliases || [])]) || "Unknown"}`,
    },
  ];
  return definitions.map((clue, index) => {
    const number = index + 1;
    if (number <= unlocked) return { ...clue, number, state: "open" };
    if (number === unlocked + 1) {
      return {
        ...clue,
        number,
        state: "next",
        text: `Clue ${number} unlocks after your next wrong guess`,
      };
    }
    return {
      ...clue,
      number,
      state: "locked",
      text: `Clue ${number} is still locked`,
    };
  });
}

export function resultMessage(round) {
  if (round.status === "won") {
    return [
      "Instant recognition!",
      "Two and through.",
      "Got there.",
      "The clues paid off.",
      "Right at the death!",
    ][round.guessesUsed - 1] || "Got there.";
  }
  return "Not this time — a fine career all the same.";
}

export function guessCounter(round) {
  if (round.status === "playing") {
    return `Guess ${round.guesses.length + 1} of ${GUESSES_PER_PLAYER}`;
  }
  if (round.status === "won") {
    return `Solved in ${round.guessesUsed}`;
  }
  return "Out of guesses";
}

/** Five dots: wrong, then correct on a win, then unused. */
export function guessDots(round) {
  const dots = Array.from({ length: GUESSES_PER_PLAYER }, () => "unused");
  if (round.status === "lost") {
    return dots.map(() => "wrong");
  }
  const wrong = round.status === "won" ? round.guessesUsed - 1 : round.guesses.length;
  for (let index = 0; index < wrong; index += 1) dots[index] = "wrong";
  if (round.status === "won") dots[round.guessesUsed - 1] = "correct";
  return dots;
}

export function shareRow(round) {
  if (round.status === "won") {
    const wrong = round.guessesUsed - 1;
    return "🟥".repeat(wrong) + "🟩" + "⬜".repeat(GUESSES_PER_PLAYER - round.guessesUsed);
  }
  return "🟥".repeat(GUESSES_PER_PLAYER);
}

export function allRoundsFinished(progress) {
  return progress.rounds.every(isRoundOver);
}
