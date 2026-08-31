# Do They Charge? — handoff notes

## What's actually built and verified right now

- A real Next.js app (App Router, TypeScript), deployed live on Vercel at **do-they-charge-app.vercel.app** (production alias — use this URL, not one of the per-deployment hash URLs, which can be stale).
- **Real, persistent storage**: Supabase (hosted Postgres). `restaurants` and `reports` tables, RLS enabled, public read policies, and narrow public insert policies that let a diner submit a report using only the public `anon` key — no service_role key anywhere in the app. `src/lib/supabase.ts` / `src/lib/data.ts` do the wiring.
- Both reads and writes are verified working end-to-end against the live production URL: the homepage/search/area/restaurant pages all render real Supabase data (520 restaurants), and a direct test submission through `POST /api/reports` produced a real Postgres row (UUID id, correct FK to the existing restaurant) that was visible in the Supabase table editor — then cleaned up afterwards.
- Every restaurant gets its own URL and its own `<title>`/meta description built for the exact long-tail query it should rank for ("Does [name] add a service charge?").
- The submission form has basic anti-abuse built in: a honeypot field (bots fill every input; real visitors never see it) and a simple per-IP rate limit.
- Loaded with a 520-restaurant **sample** (Westminster, Birmingham, Glasgow City, Edinburgh, Manchester, Leeds, North Yorkshire, Camden — the top areas by restaurant count from the FSA data), not the full national set yet. See "Going nationwide for real" below.

## One important gotcha hit and fixed this session

The first deploy of the Supabase-wired code **failed to build** (missing env vars at build time — `generateStaticParams` needs `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` to pre-render restaurant pages). After adding the env vars in Vercel, that same failed deployment was redeployed and succeeded — but testing briefly continued against an old, stale per-deployment preview URL that looked live but wasn't actually the current production build, which made report submissions look like they were silently failing. Always test against **do-they-charge-app.vercel.app** (or check the "Current"/"Production" badge on the exact deployment in the Vercel dashboard) rather than a bookmarked hash URL.

## Still static, not yet live-updating

Restaurant and area pages are built with `generateStaticParams` at deploy time (SSG) — a new report submitted by a diner is saved to Supabase immediately, but won't show up on that restaurant's page until the site is rebuilt/redeployed, or until the ISR switch below is made. This is a known, deliberate gap, not a bug.

## Going nationwide for real

The full FSA dataset — 140,921 restaurant/café records, already slugged and ready to import — is sitting at:

`Downloads/do-they-charge-data/restaurants_seed.json` (33MB, on your machine)

Now that a real database exists, the next step is to import that file wholesale into the `restaurants` table (replacing/extending the 520-row sample) and switch two things over, both already called out in code comments:

1. In `src/app/[area]/[slug]/page.tsx`, replace `generateStaticParams` returning every slug with on-demand generation instead — pre-building 140k pages at deploy time would make builds painfully slow. Add `export const dynamicParams = true;` and `export const revalidate = 3600;` (or similar) so pages generate on first visit and get cached — this also solves the "still static" gap above, since pages would refresh periodically instead of only on redeploy.
2. Same treatment for the area browse pages.

## What's left (only things that need your input)

1. **Register the domain** — explicitly deferred for now, at your request. Come back to this once everything else is settled.
2. **Import the full 140k-restaurant dataset** and flip the ISR switch above — ready whenever you want to go nationwide instead of the 520-restaurant sample.
3. **Decide on moderation.** Right now every report auto-publishes instantly. That's fine for now, worth a second thought once this is a public, indexed, nationwide site with real restaurants' names attached. Options range from "leave it as-is" to a lightweight review queue.

## Running it yourself in the meantime

```
npm install
npm run dev
```

Then open `http://localhost:3000`.
