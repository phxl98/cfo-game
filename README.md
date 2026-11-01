# CFO Game (Lufthansa)

Live classroom game for RFMP (EBC2055). Teams join at `/`, the host runs the game at `/host`, `/print` is the handout.

## Try it locally (no setup)
```bash
npm install
npm run dev
```
Without Supabase keys the app runs in **local mode**: all tabs of one browser share the game. Host PIN: `1234`.

## Real setup for class (about 10 minutes)
1. Create a free project at supabase.com.
2. SQL Editor → paste `supabase/schema.sql` → change `'CHANGE-ME'` in the last line to your host PIN → Run.
   Already installed before November 2026? Also run `supabase/migration-2-bonus.sql` and then `supabase/migration-3-ceo-penalty.sql` once each (CEO bonus and penalty).
3. Project Settings → API: copy the Project URL and the anon/publishable key into `.env.local`
   (see `.env.example`). Restart `npm run dev`.
4. Deploy: push to GitHub, import in Vercel, add the same two env variables there.
   `vercel.json` already handles the routes.

The host PIN lives only in the database, never in the website code.
Free Supabase projects pause after 7 days without traffic: open the site the day before class.

## Editing content
Everything is in `src/content/rounds.ts`. Inputs sit at the top; answers are computed from them,
so changing a number updates the answer key. `npm test` checks the published answer key; update
`src/lib/rounds.test.ts` when you change numbers on purpose.

## Classroom flow (host buttons)
Start round → Unlock round → (timer) → Trigger event → Reveal answers → Next round.
"Jump" goes to any round. After each reveal the host screen shows one discussion question (backup questions fold out). The route status bar (R2–R5) updates after each reveal. Each team is a CFO; its score is its pay (1 point = €1k), earned by answering correctly. The presenters act as CEO: in the leaderboard view "+10k" pays a team a bonus for a good argument, "−10k" docks its pay. Round 4 is the only round with breaking news; "Next round" in round 4 drops the news before moving on.
Leaderboard toggles the projector view; after the last round (5), "Final screen".
