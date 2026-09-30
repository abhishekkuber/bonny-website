# Supabase setup

## 1. Create the project
1. supabase.com -> New project (free plan). Region: London is fine.
2. Set a database password and keep it yourself. Nothing in this repo needs it.

## 2. Auth settings (Dashboard -> Authentication)
- **Sign In / Providers**: turn **Allow anonymous sign-ins** ON.
- Leave email / other providers off. Nobody signs up with email.
- (Optional, later) enable CAPTCHA to stop bots creating anonymous users.

## 3. Run the SQL (Dashboard -> SQL Editor)
1. Paste each file in `migrations/` **in order** (0001 to 0007) -> Run. Each was run once; never edit an old one.
2. Paste `seed.sql` -> Run (30 questions for the "need an idea?" button + 25 this-or-that pairs).
3. Mint the two invite codes:
   ```sql
   select public.create_invite('me')  as kubie_code,
          public.create_invite('her') as bonny_code;
   ```
   Keep them private. Each works once.

## 4. Keys (Project Settings -> API)
Paste into `assets/js/config.js`:
- **Project URL**
- **anon / publishable key** (safe to be public; RLS protects the data)

Never use or commit the `service_role` key.

## 5. Join
- You: open `.../join.html#invite=<kubie_code>` once on your device.
- Bonny: send her `.../join.html#invite=<bonny_code>`.

If either of you clears browser data, switches device, or moves to a different site address
(localhost vs the live site), you become a new anonymous session. Mint a fresh code:
`select public.create_invite('her');` and open the join link again. Since `0007_reclaim_role.sql`,
redeeming it moves the existing profile, with all its data, to the new session.

## 6. The Jev edge function (mood flower)
The mood flower scores sentences with the Jev model through `functions/mood-score/index.ts`,
so the API key never reaches the browser. Needs the Supabase CLI (`brew install supabase/tap/supabase`).

1. Get a key for the free model (`jev-1.13-free`) from BeatAPI. Never paste it into chat or commit it.
2. Log in and set the secrets:
   ```sh
   supabase login
   supabase secrets set JEV_API_KEY=YOUR_KEY JEV_URL=https://api.beatapi.io/v1/systemone JEV_MODEL=jev-1.13-free --project-ref qfxavyjqaxcefbzpyofl
   ```
3. Deploy (redo this whenever `index.ts` changes):
   ```sh
   supabase functions deploy mood-score --no-verify-jwt --project-ref qfxavyjqaxcefbzpyofl
   ```
   `--no-verify-jwt` is intentional: the function checks the caller is one of the two profiles
   itself, and the gateway check can't handle the new publishable keys.
4. Test from the browser console on a page of the site:
   ```js
   const { db } = await import('/assets/js/db.js');
   await db.functions.invoke('mood-score', { body: { sentences: ['i am happy today'] } })
   ```
   Errors: 429 = free tier limit (1 successful request per minute), 402 = the account needs funds,
   502 = upstream error (the body says why: `await error.context.json()`).

## Testing the calendar
`dummy_moods.sql` fills the last 25 days for both profiles. Remove it with
`delete from public.moods where note like '[demo]%';`.

## Adding features later
New file `migrations/0008_<name>.sql` (next number), copying the pattern in the notes table:
`author_id uuid default auth.uid()`, RLS on, `is_member()` to read, author to delete.
