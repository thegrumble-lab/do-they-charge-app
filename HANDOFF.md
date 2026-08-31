# Do They Charge? — handoff notes

## What's actually built and verified right now

- A real Next.js app (App Router, TypeScript), deployed live on Vercel at **do-they-charge-app.vercel.app** (production alias — use this URL, not one of the per-deployment hash URLs, which can be stale).
- **Real, persistent storage**: Supabase (hosted Postgres). `restaurants` and `reports` tables, RLS enabled, public read policies, and narrow public insert policies that let a diner submit a report using only the public `anon` key — no service_role key anywhere in the app. `src/lib/supabase.ts` / `src/lib/data.ts` do the wiring.
- **The full national dataset is loaded**: all 140,921 restaurants/cafés from the FSA data, across 363 areas. Verified via `select count(*)` in Supabase (140,921, all unique on both `fhrsid` and `(area_slug, slug)`).
- Both reads and writes are verified working end-to-end against the live production URL: the homepage/search/area/restaurant pages all render real Supabase data, and a direct test submission through `POST /api/reports` produced a real Postgres row (UUID id, correct FK to the existing restaurant) that was visible in the Supabase table editor — then cleaned up afterwards.
- Every restaurant gets its own URL and its own `<title>`/meta description built for the exact long-tail query it should rank for ("Does [name] add a service charge?").
- The submission form has basic anti-abuse built in: a honeypot field (bots fill every input; real visitors never see it) and a simple per-IP rate limit.
- Pages are generated on demand with ISR (`dynamicParams = true`, `revalidate = 3600`) instead of all pre-built at deploy time — necessary at this scale (see "Going nationwide" below).
- Search is server-side (`/api/search`, backed by `searchRestaurants()` and its `pg_trgm` index) — the homepage no longer ships the full restaurant list to the browser. At 520 rows that was fine; at 140,921 it would have meant downloading the entire dataset (tens of MB, including every report) on every page load.

## Two gotchas hit and fixed this session

1. The first deploy of the Supabase-wired code **failed to build** (missing env vars at build time). After adding the env vars in Vercel, that same failed deployment was redeployed and succeeded — but testing briefly continued against an old, stale per-deployment preview URL that looked live but wasn't actually the current production build, which made report submissions look like they were silently failing. Always test against **do-they-charge-app.vercel.app** (or check the "Current"/"Production" badge on the exact deployment in the Vercel dashboard) rather than a bookmarked hash URL.
2. When importing the full dataset, truncating the old 520-row sample first would have been the "obvious" approach — but permanently deleting data isn't something I can do directly, even with your go-ahead. Turned out not to be needed anyway: the 520-row sample was confirmed (by `fhrsid`) to be a strict subset of the full 140,921, so the import just added the ~140,400 rows that weren't already there. Nothing was deleted at any point.

## Going nationwide for real — done

~~The full FSA dataset ... is ready to import~~ — done. If you ever need to re-import or refresh from the source file, it's at `Downloads/do-they-charge-data/restaurants_seed.json` (33MB) on your machine; the import script split it into ~47k-row CSV chunks (Supabase's Table Editor import and the browser upload tool both have size limits) and uploaded each via "Import data from CSV".

## What's left (only things that need your input)

1. **Register the domain** — explicitly deferred for now, at your request. Come back to this once everything else is settled.
2. **Decide on moderation.** Right now every report auto-publishes instantly. That's fine for now, worth a second thought once this is a public, indexed, nationwide site with real restaurants' names attached. Options range from "leave it as-is" to a lightweight review queue.
3. **Minor future optimization, not urgent:** `getAreas()` (used for the homepage's area grid and area-page metadata) currently fetches all 140,921 `(area_slug, area)` pairs and aggregates counts in JS on every request. It works and is cached for an hour via `revalidate`, but a Postgres `GROUP BY` (via an RPC function) would be cheaper. Worth doing if Supabase usage/latency ever becomes a concern.

## Running it yourself in the meantime

```
npm install
npm run dev
```

Then open `http://localhost:3000`.
