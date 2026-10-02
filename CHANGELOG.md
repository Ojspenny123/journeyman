# Changelog

## V2.0.0 — 2026-10-02

- Guessing area sits under the career table and above the clues, so a new clue no longer pushes the search box
- Production deploy on Netlify, with `netlify.toml`, `robots.txt`, and a favicon

## V1.0.0 — 2026-10-02

First playable release of Journeyman.

- Daily puzzle of 3 players, the same for everyone, resetting at midnight UK time
- Wikipedia-style senior career table with loan rows and a total
- Five guesses per player, autocomplete from the full squad, and four unlocking clues
- Streaks, stats, guess distribution, and saved progress in localStorage
- Spoiler-free emoji share card, with the Web Share API on mobile and a copy button elsewhere
- Light, colourful, mobile-first design
- Seed squad built from Wikipedia, plus `scripts/build-players.js` and a data report
