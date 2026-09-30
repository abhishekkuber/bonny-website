# bonny 💕

A little website for Bonny (London) from kubie (Pune). Plain HTML/CSS/JS with no build step, so it deploys straight to GitHub Pages. Data lives in Supabase.

**Status:** all eight tiles and the first game are built and tested locally. Not deployed yet. See [Before deploying](#before-deploying).

## Run locally

ES modules don't load over `file://`, so serve the folder:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. After code changes, hard-refresh (Cmd+Shift+R) to skip cached scripts.

## How you get in

1. **Kiss tax** (`index.html`): 5 kisses to enter. A joke gate stored in `sessionStorage`, not security.
2. **Join** (`join.html#invite=<code>`): the real gate. Each browser signs in *anonymously* with Supabase, then redeems a single-use invite code that makes it one of the two profiles (`me` = kubie, `her` = bonny). Every table's row-level security says "only sessions with a profile can read or write". No emails or passwords.
3. **Hub** (`hub.html`): the home screen.

Data pages call `requireMember()` from `assets/js/db.js`, which bounces strangers to the join page.

## The pages

| Tile | Page | Data |
|---|---|---|
| cat break | `pages/cats.html` | Wikimedia Commons photos (no backend) |
| same sky | `pages/sky.html` | astronomy-engine + NASA APOD (key in `config.js`) |
| our weather | `pages/weather.html` | Open-Meteo, Pune and London |
| love letters | `pages/love.html` | PoetryDB + curated `assets/data/quotes.js` |
| post-it wall | `pages/notes.html` | `notes`, live via realtime, draggable |
| mood flower | `pages/mood.html`, `pages/mood-history.html` | `moods`, Jev via edge function |
| daily question | `pages/question.html` | `asks` + `replies` |
| this or that | `pages/this-or-that.html` | `prompts` + `prompt_votes` |

### Games (hub, below the tiles)
| Game | Page | Data |
|---|---|---|
| kiss catcher | `pages/kiss-catcher.html` | `scores` table (`game = 'kiss-catcher'`), your best vs theirs + top 5 |
| connect 4 | `pages/connect-4.html` | `matches` table via `assets/js/match.js`, turn-based, async |
| tic tac toe | `pages/tic-tac-toe.html` | `matches` table, turn-based, async |
| make a wish 🎂 | `pages/birthday.html` | none (pure animation). Hold space / the button to inhale, candles go out when the bar fills. Uses `Actor` from `scene.js`: kubie peeks in from the left edge when she first inhales, then runs in and kisses her cheek after the candles go out. `?candles=N` (1-12) sets the candle count; default 7. |

Turn-based games share `assets/js/match.js` (create a match, `submitMove` that only lands if it's still your turn, abandon, scoreboard tally, alternate who starts, realtime watcher). Tic tac toe and Connect 4 both work like this: the first mover (X / rose) always goes first and the starter alternates each game; a move is refused if the other person moved first, the board just refreshes; the hub tile shows a "your turn" badge when a game is waiting on you. Moves are validated in the browser only (fine for two people).

Kiss catcher is plain DOM + `requestAnimationFrame` (no canvas): catch 💖 (+1) 💋 (+3) 🐱 (+5) with your chibi's face, dodge 💔 (lose a life), 3 lives, x2..x4 multiplier for 5+ catches in a row, speeds up over 90 seconds. Steer with arrow keys / A-D or drag / mouse. Saves a row per finished game.

### Mood flower
Write, then click **read my feelings**. One request to the `mood-score` edge function scores every unread sentence (6 feelings, 0..2 each) with the Jev model. The flower is a **pie chart of the latest sentence's percentages** (`toPercents` in `emotion.js`, always adds to 100). **save today** stores one row per UTC day: the percentages (`feelings` jsonb) and the words. Saving again the same day overwrites it. Nothing autosaves. History is a month calendar that redraws every flower from the stored percentages.

Jev's free tier allows **1 successful request per minute**, so reading is button-driven with a 60s cooldown. Never call it per keystroke.

### Daily question
Each of you asks one question per (UTC) day for the other. Only the other person can answer; you can reword or delete your question until it's answered. "need an idea?" pulls from `question_bank`. The hub tile shows a badge when a question is waiting.

### This or that
One pair at a time. You only see the other person's pick after you've picked (enforced in the database). Agreement % on top, add your own pairs, picks are final.

## Structure

```
index.html            kiss-tax gate
join.html             invite landing (anonymous sign-in + redeem code)
hub.html              home screen
pages/                one page per tile
assets/css/           theme.css (shared) + one file per page
assets/js/
  config.js           names, cities, NASA key, Supabase URL + publishable key
  db.js               Supabase client, whoami(), requireMember(), join(code)
  fx.js               hearts, toast, shake, leaveTo()
  kiss-catcher.js     the game loop, spawning, scoring
  match.js            shared helpers for turn-based games on the matches table
  tic-tac-toe.js      tic tac toe
  birthday.js         the candle-blowing cake
  connect-4.js        connect 4 (flat 42-cell board, index = row*7+col, row 0 on top)
  tax.js              kiss-tax flag + KissTax.require()
  emotion.js          feelings, colours, splitSentences(), toPercents()
  flower.js           SVG stitched flower (pie of percentages)
  characters.js       chibi SVG art of both of you (scene.js animates them)
  <page>.js           logic for each page
supabase/
  SETUP.md            step-by-step Supabase setup
  migrations/         0001..0007, run in order in the SQL editor
  seed.sql            30 questions + 25 this-or-that pairs
  dummy_moods.sql     fake mood history for testing the calendar
  functions/mood-score/index.ts   edge function (Jev proxy)
```

## Adding a page

In `<head>`, protect it with the kiss tax:

```html
<script src="../assets/js/tax.js"></script>
<script>KissTax.require();</script>
```

For data, `import { db, requireMember } from './db.js'` and `const me = await requireMember();`. Always use relative paths (no leading `/`) so it also works under `https://<user>.github.io/<repo>/`. New tables go in a new `supabase/migrations/000N_*.sql` copying the pattern in `0001` (author defaults to `auth.uid()`, RLS on, `is_member()` to read). Never edit a migration that's already been run.

## Before deploying

- [x] `git init` and first commit done.
- [ ] Create a public GitHub repo, push, enable Pages (Settings -> Pages -> main / root).
- [x] Dev playgrounds (`characters.html`, `fonts.html`) deleted.
- [ ] Decide on the colours (still open).
- [ ] Check `config.js`: the NASA key and the Supabase URL + publishable key are committed. Both are fine to be public (RLS protects the data), but the NASA key is yours; regenerate if you'd rather.
- [ ] Never commit the Supabase `service_role` key or the Jev / BeatAPI key (it lives only in Supabase secrets).
- [ ] Test on a phone. It's desktop-first; the wall's drag and the calendar need a real touch check.
- [x] Nothing to change in Supabase for the new address (anonymous sign-in uses no redirects; requests from any site are allowed).
- [ ] Run `0007_reclaim_role.sql`, then join the live site with a fresh code: `select public.create_invite('me');`. Sessions are per browser *and* per site address, so localhost and github.io are different identities; 0007 lets a new code take over your existing profile and keep your data.
- [ ] Mint Bonny's invite (`select public.create_invite('her');`) and send `https://<site>/join.html#invite=<code>` only after the site is live. Codes are single-use.
- [ ] Watch out: Supabase free projects pause after 7 days of inactivity (unpause in the dashboard; nothing is lost).

## Ideas not built yet

- Birthday cake: make the tile appear only around her birthday (needs the date in `config.js`), use her real age for the candle count, optionally blow by real microphone input.
- A real-time two-cat co-op puzzle game (inspired by The Missing Tail): both online, synced through Supabase Realtime broadcast. Big; prototype one room first.
- "Days until we meet" countdown (the `kv` table is there for shared settings).
- Photos via the private `photos` storage bucket (already created).
- Autosave after each Jev reading (currently save is manual by design).

## Notes

- Anything private is protected by Supabase RLS, not the kiss tax.
- Days everywhere (moods, daily question) are **UTC days**, so they roll over at 5:30am in Pune.
