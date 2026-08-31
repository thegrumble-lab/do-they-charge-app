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

## Gotchas hit and fixed this session

1. The first deploy of the Supabase-wired code **failed to build** (missing env vars at build time). After adding the env vars in Vercel, that same failed deployment was redeployed and succeeded — but testing briefly continued against an old, stale per-deployment preview URL that looked live but wasn't actually the current production build, which made report submissions look like they were silently failing. Always test against **do-they-charge-app.vercel.app** (or check the "Current"/"Production" badge on the exact deployment in the Vercel dashboard) rather than a bookmarked hash URL.
2. When importing the full dataset, truncating the old 520-row sample first would have been the "obvious" approach — but permanently deleting data isn't something I can do directly, even with your go-ahead. Turned out not to be needed anyway: the 520-row sample was confirmed (by `fhrsid`) to be a strict subset of the full 140,921, so the import just added the ~140,400 rows that weren't already there. Nothing was deleted at any point.
3. After going nationwide, `/browse/[areaSlug]` started 404ing for some real areas (e.g. Tower Hamlets), even though their restaurants existed and loaded fine directly. Cause: `getAreas()` ran an unordered, unranged Supabase query over all 140,921 rows — PostgREST caps how many rows an unranged query returns (commonly 1,000), so it was silently truncating the result and dropping whole areas from the list, which then 404'd via the `if (!area) notFound()` check. Fixed by paging through the table with `.range()` instead of a single unranged select.
4. Same bug, second spot: once that fix made `/browse/tower-hamlets` load, it showed exactly "1000 restaurants listed" — a suspiciously round number. `getRestaurantsByArea()` had the identical unranged-query issue (any area with over 1,000 restaurants got silently truncated). Fixed the same way, with `.range()` paging. Worth keeping an eye out for this pattern anywhere else a query fetches an unbounded set of rows without an explicit `.range()`/`.limit()`.
5. Search for something like "flat iron westminster" (restaurant name + area as separate words) returned no matches. `searchRestaurants()` was matching the *whole* search string as one substring against name/area/postcode, so a query spanning two columns could never match. First fix attempt chained one `.or()` call per word assuming they'd AND together — they don't; each call overwrites the same `or` query param, so only the last word's condition ever actually applied (confirmed live: "flat iron" was silently only filtering on "iron"). Correct fix: PostgREST supports nested `and()`/`or()` groups inside a single filter value, so build one combined `or(and(or(word1 in any column), or(word2 in any column), ...))` expression and pass it in a single `.or()` call. Verified live: "flat iron westminster" now returns exactly the 5 Flat Iron branches in Westminster, and "iron" alone (58 matches) is now a proper superset of "flat iron" (23) rather than an identical result.

## Going nationwide for real — done

~~The full FSA dataset ... is ready to import~~ — done. If you ever need to re-import or refresh from the source file, it's at `Downloads/do-they-charge-data/restaurants_seed.json` (33MB) on your machine; the import script split it into ~47k-row CSV chunks (Supabase's Table Editor import and the browser upload tool both have size limits) and uploaded each via "Import data from CSV".

## Automated weekly sync (in progress — see "What's left" for the remaining setup steps)

The site now has a mechanism to keep itself in sync with the FSA's national FHRS dataset automatically, instead of relying on another one-off manual import:

- **What it does:** downloads `FHRS_All_en-GB.csv` (the FSA's daily-updated national file — despite the word "weekly" in how we're running it), filters to `BusinessTypeID` 1 (Restaurant/Cafe/Canteen) and 7843 (Pub/bar/nightclub) — **takeaways/sandwich shops (7844) are deliberately excluded**, per your call when we set this up — then upserts by `fhrsid` (new restaurants get inserted, existing ones get their name/address/postcode/lat/lng refreshed) and **soft-deletes** anything currently active that's no longer in the filtered feed (`is_active = false, removed_at = now()`, never a real `DELETE`).
- **Why soft-delete, not hard delete:** a hard delete would cascade to any diner-submitted reports on that restaurant. Soft delete hides a restaurant from listings/search (`.eq("is_active", true)` was added to `getAreas`, `getRestaurantsByArea`, `searchRestaurants`, `getRestaurantCount` in `src/lib/data.ts`) while its permalink still resolves — `getRestaurantBySlug` is deliberately left unfiltered — showing a small "no longer on the FSA register" notice instead of a raw 404, so an already-indexed URL doesn't just vanish. Fully reversible: if a business reappears in a later feed, it's reactivated (`is_active` back to `true`, `removed_at` cleared) rather than re-created.
- **Why this runs in GitHub Actions, not from a Claude session or Vercel:** this session's cloud sandbox and your computer's local shell both sit behind an egress allowlist that blocks the FHRS download domain outright (confirmed directly — `curl` gets `connect_rejected`/`blocked-by-allowlist` from both). Even the sanctioned WebFetch tool, which *can* reach the domain, hits a 30MB response-size cap on a file that's much bigger than that. GitHub Actions runners have normal internet access and a far longer execution window than a Vercel serverless function, which matters for streaming-parsing a large national CSV. See `.github/workflows/sync-fhrs.yml` and `scripts/sync-fhrs.ts` (run via `npm run sync:fhrs`, which uses `tsx` so the script can import the same `slugify()` the app uses from `src/lib/slug.ts` — an existing restaurant's `area_slug`/`slug` is never regenerated, only ever set once for a genuinely new row, so already-indexed URLs never change).
- **Safety guard:** if the parsed/filtered feed comes back with implausibly few rows (under half of what's currently active, or under 20,000 absolute), the script refuses to write anything and fails loudly — protects against a truncated download or a schema change silently mass-deactivating the site.
- **Auth:** a Supabase `service_role` key, stored only as a GitHub Actions secret (`SUPABASE_SERVICE_ROLE_KEY`) — never added to Vercel, so the deployed app's anon-key-only architecture (see above) is unchanged. This is a separate, offline batch credential.
- **DB migration applied** (Supabase SQL editor, additive/non-destructive — for the record, since this project has no migration tooling):
  ```sql
  alter table restaurants add constraint restaurants_fhrsid_key unique (fhrsid);
  alter table restaurants add column is_active boolean not null default true;
  alter table restaurants add column removed_at timestamptz;
  create index restaurants_is_active_idx on restaurants (is_active);
  ```

## What's left (only things that need your input)

1. **Register the domain** — explicitly deferred for now, at your request. Come back to this once everything else is settled.
2. **Decide on moderation.** Right now every report auto-publishes instantly. That's fine for now, worth a second thought once this is a public, indexed, nationwide site with real restaurants' names attached. Options range from "leave it as-is" to a lightweight review queue.
3. **Minor future optimization, not urgent:** `getAreas()` (used for the homepage's area grid and area-page metadata) fetches all 140,921 `(area_slug, area)` pairs, paginated in 1,000-row batches, and aggregates counts in JS. It's correct and cached for an hour via `revalidate`, but a Postgres `GROUP BY` (via an RPC function) would be cheaper than ~141 round trips. Worth doing if Supabase usage/latency ever becomes a concern.
4. **Finish rolling out the weekly sync** (see above): add the two GitHub Actions secrets, run a dry run and sanity-check the numbers, run one real sync and verify live, then enable the `schedule:` trigger for real. Full rollout steps below.

## Running it yourself in the meantime

```
npm install
npm run dev
```

Then open `http://localhost:3000`.
