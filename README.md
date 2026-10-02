# Journeyman

**Version 2.0.0**

Name the player from their career.

Journeyman is a daily football guessing game. Each UK day, everyone gets the same three players. You see a Wikipedia-style senior career table with the name removed, and you have five guesses to find who it is. Wrong guesses unlock clues. It is a static site: plain HTML, CSS, and JavaScript, with no backend and no build step for the game itself.

## Play locally

The game uses ES modules, so open it through a local server rather than a `file://` URL.

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

From this folder you can also run:

```bash
npm start
```

## Deploy

Upload the project root to any static host (GitHub Pages, Netlify, Cloudflare Pages, S3, or a plain web server). The files the host needs are:

- `index.html`
- `css/`
- `js/`
- `data/players.json`

No server-side code runs in production. Progress, streaks, and stats stay in the browser under `localStorage` keys that start with `journeyman_`.

The day rolls over at midnight Europe/London. Puzzle #1 is 22 August 2026.

## Deployment

Production is a static site on Netlify. `netlify.toml` publishes the project root and does not run a build. `index.html` and `data/players.json` are revalidated on every visit. CSS, JavaScript, and `favicon.svg` are cached for seven days. Those files are not content-hashed, so a style or script change can take up to a week to replace a cached copy. The page and the squad update immediately.

Link the repo once (Netlify UI, or `netlify login` then `netlify init` in this folder). After that, redeploy with:

```bash
netlify deploy --prod
```

A push to the production branch on a linked site does the same thing.

To roll back, open the site in Netlify, go to Deploys, choose an earlier production deploy, and select Publish deploy. From a linked folder you can also run:

```bash
netlify rollback
```

That restores the previous production deploy. Because the HTML and player file are not cached, the rolled-back puzzle is what the next visit loads. Cached CSS or JavaScript from the newer deploy can linger for up to seven days.

## Update the player list

`scripts/build-players.js` reads senior-career infoboxes from the English Wikipedia API and writes `data/players.json`. Names and photo URLs are stored as base64 so the answer is not readable at a glance. A short QA note is written to `data/build-report.md`.

```bash
node scripts/build-players.js
node scripts/build-players.js "Robin van Persie" "Craig Bellamy"
node scripts/build-players.js --append "Luis Suárez (Uruguayan footballer)"
```

With no names, the script uses the curated seed list inside the file (players with varied, multi-club careers). Check the report before shipping a new squad. The launch target for a fully curated pool is 300–500 players; version 1 ships the seed squad so the game is playable immediately.

Adding or removing players changes which trio falls on a future date, because the daily deal is a seeded shuffle of the whole pool.

```bash
node scripts/check-game.js
```

That checks the date seed, guess rules, streaks, and that `players.json` does not contain plaintext names.

## How a day works

- The puzzle number is the number of London civil days since 22 August 2026, starting at 1.
- Three players are dealt from a deterministic shuffle. Nobody repeats until the pool has been used.
- Five guesses per player. Guess 1 wrong opens nationality, then position, then international caps and goals, then birth decade and current or last club.
- Finishing all three players, right or wrong, keeps the streak. Missing a full UK day sets the current streak back to 0.
- A finished day cannot be replayed. Refreshing keeps an in-progress day.
- Share text uses squares only. It never includes a player's name.

## Planned for V3

These are not in version 2:

- Dark mode
- Practice mode and an archive of previous days
- A leaderboard
