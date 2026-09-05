# Do They Charge? — handoff notes

## What's actually built and verified right now

- A real Next.js app (App Router, TypeScript), deployed live on Vercel at **do-they-charge-app.vercel.app** (production alias — use this URL, not one of the per-deployment hash URLs, which can be stale).
- **Real, persistent storage**: Supabase (hosted Postgres). `restaurants` and `reports` tables, RLS enabled, public read policies, and narrow public insert policies that let a diner submit a report using only the public `anon` key — no service_role key anywhere in the app. `src/lib/supabase.ts` / `src/lib/data.ts` do the wiring.
- **The full national dataset is loaded and kept in sync automatically**: restaurants, cafés and pubs from the FSA data (183,798 active listings — see "Automated weekly sync" below), across all local authority areas, minus known fast-food/coffee/bakery chains (they don't charge a service fee, so there's nothing to report on). Verified via `select count(*)` in Supabase.
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

## Automated weekly sync — done, live, and running on its own

The site now keeps itself in sync with the FSA's national FHRS dataset automatically, instead of relying on another one-off manual import. Fully rolled out and verified:

- Dry run confirmed the numbers before anything was written (50,585 new, 140,921 updated, 0 deactivated — see below for why 0 deactivated is expected).
- The first real run applied those changes live: **140,921 → 191,506 active listings**. Confirmed both via a direct Supabase count and by searching the live site for a pub chain (Wetherspoons) and getting real, active results back.
- The weekly `schedule:` trigger is now enabled (`0 4 * * 1` — every Monday, 04:00 UTC) alongside the existing manual `workflow_dispatch` trigger, so no one needs to remember to run this by hand.

- **What it does:** downloads `FHRS_All_en-GB.csv` (the FSA's daily-updated national file — despite the word "weekly" in how we're running it), filters to `BusinessTypeID` 1 (Restaurant/Cafe/Canteen) and 7843 (Pub/bar/nightclub) — **takeaways/sandwich shops (7844) are deliberately excluded**, per your call when we set this up — then upserts by `fhrsid` (new restaurants get inserted, existing ones get their name/address/postcode/lat/lng refreshed) and **soft-deletes** anything currently active that's no longer in the filtered feed (`is_active = false, removed_at = now()`, never a real `DELETE`).
- **Why soft-delete, not hard delete:** a hard delete would cascade to any diner-submitted reports on that restaurant. Soft delete hides a restaurant from listings/search (`.eq("is_active", true)` was added to `getAreas`, `getRestaurantsByArea`, `searchRestaurants`, `getRestaurantCount` in `src/lib/data.ts`) while its permalink still resolves — `getRestaurantBySlug` is deliberately left unfiltered — showing a small "no longer on the FSA register" notice instead of a raw 404, so an already-indexed URL doesn't just vanish. Fully reversible: if a business reappears in a later feed, it's reactivated (`is_active` back to `true`, `removed_at` cleared) rather than re-created.
- **Why the first real run deactivated nothing:** every one of the original 140,921 restaurants matched a `BusinessTypeID 1` row in the fresh feed, meaning the original import never actually included takeaways in the first place — there was nothing to remove for that reason. All 50,585 new rows are effectively the pubs entering scope for the first time. A future run would deactivate something if a business closes or the FSA reclassifies it.
- **Fast-food/coffee/bakery chains are excluded, retroactively and going forward.** They don't charge a service fee, so there's nothing for this site to usefully report on them. `scripts/sync-fhrs.ts` matches `BusinessName` case-insensitively against a keyword list (`EXCLUDED_CHAIN_KEYWORDS`) covering McDonald's, Burger King, KFC, Subway, Domino's, Pizza Hut, Taco Bell, Wendy's, Popeyes, Wingstop, Papa John's, Chicken Cottage, Greggs, Starbucks, Costa Coffee and Pret a Manger — add a chain there and it's excluded from every future sync too, no other code changes needed. Rolled out the same way as the pub/takeaway scope change: dry run first (7,708 would deactivate, numbers sanity-checked), then a real run that deactivated exactly those 7,708 (191,506 → 183,798 active), verified via a direct Supabase count (0 active McDonald's rows remaining) and a live `/api/search?q=mcdonald` hit (empty results) — the delisted permalinks still resolve with the "no longer covered" notice, same as any other soft-deleted restaurant.
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

## Researched reports — confirming service-charge status where possible

Most of the ~184k active listings show "No reports yet" — the FHRS feed has no concept of service charges, and diner submissions are rare on a brand-new site. This adds a second, honest way to fill some of that in: a machine-researched report, clearly distinct from a diner-submitted one, backed by a real citable source — never a guess.

**Schema** (Supabase SQL editor, additive/non-destructive):
```sql
alter table reports add column source_url text;

alter table reports drop constraint reports_source_check;
alter table reports add constraint reports_source_check
  check (source = any (array['seed','diner','researched']));
```

**App changes**: `Report.source` (`src/lib/types.ts`) gained `"researched"`, plus a nullable `sourceUrl`. `src/lib/data.ts` threads `source_url` through the `DbReport`/`toRestaurant()` mapping. The restaurant detail page (`src/app/[area]/[slug]/page.tsx`) gets a third branch alongside the existing seed/diner ternary — a researched report reads "Researched — checked \<date\>" with a link to `sourceUrl` when one exists — and `generateMetadata`'s hardcoded "...diner report(s)" wording was made source-agnostic so it doesn't misdescribe a researched-only restaurant. List views (`RestaurantsTable.tsx`) needed no change — they only ever showed the status pill, never the source.

**Chain-policy angle: dropped.** The original plan (see the plan file this session ran from) included a second mechanism — a curated list of multi-location chains' published policies, applied automatically by `scripts/sync-fhrs.ts` on every sync. Per your explicit call partway through this session ("Drop the chain angle, focus on independent listings"), this was dropped entirely — no chain-policy module, no Pizza Express/Wetherspoons/etc. entries, no self-healing sync-time backfill. Independent listings only.

**Independent-listing pilot — done, one-off, interactive.** 75 active restaurants were sampled (`order by random() limit 75`, zero existing reports, via a scratch `pilot_sample` table) and each researched individually against its own website, FAQ, T&Cs or booking terms — never guessed. Results were inserted directly via the Supabase SQL editor as `source: 'researched'` rows. Per your call, a restaurant with zero findings still gets a report — `status: 'unclear'` with a note explaining nothing citable was found — rather than being left blank; genuinely ambiguous or inconsistent findings also got `unclear` with a note, not a guess.

Results: **6 of 75 (8%) got a real, citable status**; the other 69 (92%) are `unclear`. The six:
- **Dubai BBQ** and **Esffon Grill** — `no-charge`: both are takeaway/delivery-only operations with no table service, so no service charge applies.
- **GAIL's, Birmingham New Street** — `no-charge`: counter-service bakery format, per GAIL's own FAQ.
- **Saint Judes** — `groups`, 10%: the venue's own reservations/function-hire terms apply a discretionary 10% service charge to parties of 6+ and to all functions/events.
- **Tapas Brindisa Soho** — `charges`, 13.5%: an optional service charge per Brindisa's own FAQ (removable on request for a table booking, mandatory for private dining).
- **The Ivy Chester** — `charges`, percentage undisclosed: a genuine branch of The Ivy Collection, whose group-wide tipping policy confirms a discretionary service charge is added to all bills.

One flagged candidate (Heckfield Estates) was deliberately **not** shipped: a nearby estate/postcode match had a citable service-charge policy, but for a differently-named venue ("Marle"), and the match to this specific FHRS listing couldn't be confirmed — recorded as `unclear` rather than guessed, consistent with the honesty bar this whole project has held to.

**What this implies for scaling**: an 8% hit rate on a random sample, achieved via manual web research per restaurant, doesn't obviously justify a background job across the remaining ~176k independent listings — the cost (research time, or an LLM-per-restaurant API bill) per confirmed finding would be high, and 92% of the effort would still land on `unclear`. Small independents mostly don't publish a service-charge policy anywhere findable, which is exactly what you'd expect.

**Targeted-restaurant approach — tested, and it scales much better than random sampling.** Two follow-up experiments, both per your go-ahead:

1. **Phrasing test (dropped):** tried a simpler `"does [restaurant] add a service charge"` search phrasing against the 69 `unclear` restaurants from the pilot above, hoping a more direct query would surface something the original research missed. Result: 0/20 hits, and a couple of cases where the phrasing returned an unrelated same-named business — actively risky, not just unproductive. Not adopted.
2. **Targeting popular/well-known independents instead of random ones — adopted.** Rather than `order by random()`, this samples from "best independent restaurants in [city]" style lists — places likely to be established enough to have a real, maintained website with a menu PDF or T&Cs page. Two rounds so far:
   - **Round 1** (6 cities: London, Manchester, Edinburgh, Bristol, Birmingham, Glasgow): **7 of 20 candidates (35%)** got a real citable status — Condesa, Paesano Pizza, Belzan, Mambow, Timberyard, Scran and Scallie, The Kitchin. Most hits (5/7) came from menu PDFs rather than FAQ/T&Cs pages.
   - **Round 2** (8 more cities: Liverpool, Leeds, Newcastle, Sheffield, Cardiff, Belfast, Nottingham, Bath; ~15 candidates per city via parallel research agents, ~118 candidates total): **12 of 118 (~10%)** got a real citable status. The Art School and Lunya (Liverpool), The Broad Chare (Newcastle), Jöro (Sheffield), Alchemilla (Nottingham), The Circus Restaurant (Bath), and six from Belfast alone — Deane's at Queens, James Street South, Shu, Bunsen, Coco, Zen — reflecting that higher-end multi-course restaurants there commonly publish PDF menus with service-charge language. Leeds and Cardiff yielded zero hits. Of the 12, **11 were inserted** — Coco has no matching row in the FSA-sourced `restaurants` table under any name/area combination tried, so there was nothing to attach a report to; it was left out rather than guessed at or force-matched.
   - Restaurant IDs for insertion were resolved by querying `restaurants` directly by name/area/postcode in the Supabase SQL editor (not via `/api/search` — see the known issue below), and cross-checked against each restaurant's actual FSA-listed address before inserting, since generic names (e.g. more than one "Zen" or "Art School" in the same city) can otherwise silently attach a report to the wrong listing.
   - **Round 3** (8 more cities: Oxford, Cambridge, York, Brighton, Norwich, Leicester, Aberdeen, Swansea; ~15 candidates per city, ~118 candidates total): **16 of 118 (~14%)** got a real citable status. Oxford (Branca, The Folly, Cuttlefish, Edamame) and York (Roots, Star Inn The City, Los Moros) were the strongest cities this round; Leicester and Aberdeen yielded zero hits — every independent checked in those two cities either had no own-domain site or one with no service-charge language anywhere on it. Of the 16, **15 were inserted** — "Legacy at The Grand" (York) has no matching row in the FSA-sourced `restaurants` table under "Legacy" or "Grand", so it was left out rather than guessed at, same as Coco in round 2.
   - Combined "targeted" hit rate so far: **34/256 (~13%)**, holding steady across three rounds and consistently above random sampling's 8%, though still with a real per-restaurant research cost (parallel subagents, one per city, each independently checking ~15 candidates' own websites). Worth deciding deliberately whether/how far to keep scaling this before investing further, rather than assuming an unbounded background job is the right next step.
   - **Automation note (round 3):** restaurant-ID resolution and the insert itself both ran into repeated Chrome-tab instability in the Supabase SQL editor this round — typed queries occasionally landed truncated, a couple of tabs froze outright and had to be abandoned for fresh ones, and one manually-retyped verification query introduced a transcription error in a restaurant ID (caught before anything was run, by re-deriving all 15 IDs as a single JSON blob via `json_agg` and diffing against the original generated SQL, rather than trusting the earlier scrolled/paginated grid output by eye). The insert was ultimately split into three 5-row batches to avoid a further-observed pattern where typing long strings into the SQL editor froze the tab outright. Every ID was verified twice (once at generation, once via the JSON re-check) before any insert ran, and all 15 rows were spot-checked live afterward via `/api/search`.

## Automated daily research — done, live, running unattended

You asked whether the targeted-restaurant scaling above could run without you having to be present to kick off every batch and approve every website. It now can, end to end.

**The old bottleneck:** every insert this session went through the Supabase SQL Editor via browser automation — reliable enough with care, but slow, occasionally flaky (typed queries landing truncated, tabs freezing on long strings — see the round-3 automation note above), and fundamentally something that needed an interactive session driving a browser. Not something a fresh unattended session could do.

**Direct REST API access:** Supabase's project domain (`kudpgfttnsjyrbjcogkw.supabase.co`) is now on this Claude org's network allowlist (Admin settings → Capabilities → Code execution → Additional allowed domains), so any session — interactive or scheduled — can call the Supabase REST API (PostgREST) directly with `curl`, no browser involved.

**The RLS constraint that shaped the design:** the public `anon`/publishable key's insert policy on `reports` is hard-locked to `source = 'diner'` —

```sql
-- public insert reports (INSERT, role anon):
with_check = (status = ANY (ARRAY['charges','no-charge','groups','unclear']))
  AND (source = 'diner')
  AND (char_length(COALESCE(note,'')) <= 220)
```

— so the publishable key alone can never write a `source='researched'` row; only a `service_role`-equivalent secret key can bypass RLS. Loosening the public policy to allow anon `source='researched'` inserts was explicitly rejected — that would let anyone on the internet forge "researched" reports about real businesses, which undermines the whole honesty premise of this project.

**Chosen design — a narrow RPC, not the secret key, does the automation writes.** Rather than handing an unattended, fresh-every-run session the full RLS-bypass secret key (which would mean storing it in the scheduled task's prompt — persisted by the scheduler, resent into every run, a real exposure increase over "in-memory for one interactive session"), a single-purpose Postgres function was added instead:

```sql
create or replace function insert_researched_report(
  p_restaurant_id uuid,
  p_status text,
  p_pct numeric,
  p_note text,
  p_source_url text,
  p_report_date date
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if p_status not in ('charges','no-charge','groups','unclear') then
    raise exception 'invalid status: %', p_status;
  end if;
  if char_length(coalesce(p_note,'')) > 500 then
    raise exception 'note too long';
  end if;
  if p_pct is not null and (p_pct < 0 or p_pct > 100) then
    raise exception 'invalid pct: %', p_pct;
  end if;
  if not exists (select 1 from restaurants where id = p_restaurant_id) then
    raise exception 'unknown restaurant_id: %', p_restaurant_id;
  end if;

  insert into reports (restaurant_id, status, pct, note, source_url, report_date, source)
  values (p_restaurant_id, p_status, p_pct, p_note, p_source_url, p_report_date, 'researched')
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function insert_researched_report(uuid, text, numeric, text, text, date) from public;
grant execute on function insert_researched_report(uuid, text, numeric, text, text, date) to anon;
```

`security definer` means it runs with the owning role's privileges (bypassing RLS for just this one validated operation), and it's granted only to `anon` — so the safe-to-expose publishable key can call it, but can do nothing else it couldn't already do. Verified live: the publishable key can call the RPC successfully on a real restaurant, is correctly rejected by the RPC's own validation on a bogus restaurant ID, still gets a straight RLS `42501` rejection on any direct `source='researched'` table insert attempt, and can't delete rows at all. The secret key itself was used only twice this session, in-memory, for the initial round-trip validation (insert-then-delete a scratch test row) and to clean up a leftover RPC test row — never written to any file, never given to the scheduled task, and not needed again going forward.

**Daily scheduled task — live, now parallelized.** A scheduled task ("Do They Charge? — daily restaurant research round") runs at 08:00 UTC every day, entirely in the cloud (no dependency on your computer being on). It launched as one city/~15 candidates per day; at that pace, with a ~13% hit rate, it would have taken until well past the heat death of the universe to work through 184k listings — you flagged this the same day, correctly. It now dispatches 8 parallel research sub-agents per run (one per city, same fan-out the interactive rounds 1-3 used, just unattended), so each day covers ~8 cities and ~120 candidates instead of 1 and ~15 — roughly an 8x speed-up for the same daily cadence and no extra scheduling cost. Cities are picked the same way as before (checked against the DB, then a prepared list of ~36 more UK cities/towns). Still touches only the database — no git access, no HANDOFF.md updates.

**The honest ceiling, and why chains matter more than speed.** Even at 120 candidates/day, the ~13% hit rate is a property of *what independent restaurants publish*, not of how fast we look — most small independents never put their service-charge policy anywhere online, at any research speed. So parallelizing the daily task speeds up how fast we exhaust the independents that *do* have a findable answer; it was never going to make "confirm all 184k" achievable on its own. See the chain-policy backfill below for the actual step-change in coverage.

## Chain-policy backfill — done, smaller than hoped, but real and self-healing

You asked, reasonably, whether there was a bigger lever than researching one independent restaurant at a time — and chains are the obvious candidate, since one policy lookup can cover every branch. That instinct was right, but sourcing a *citable* chain policy turned out to be its own bottleneck, worth being straight about.

**What went wrong with the optimistic version of this plan:** ~22 UK-wide chains were checked against the live database first (sizing the opportunity before researching — Nando's, Pizza Express, Wagamama, Toby Carvery, Wetherspoon, Zizzi, and so on — collectively ~2,200 active listings, a huge number next to the 34 confirmed via independents so far). But most chains simply don't publish an "we add X% service charge" statement anywhere on their own consumer-facing site. What they publish instead is tronc/fair-distribution pages ("100% of tips go to staff") — which confirm nothing about whether a charge is applied or at what rate. Held to the same own-site, no-guessing bar as every independent restaurant in this project, most candidates researched (Nando's, Wagamama, Toby Carvery, Wetherspoon, Beefeater, Harvester, Zizzi, ASK Italian, Bella Italia, Las Iguanas, All Bar One, and others) turned up nothing citable and were left alone — not marked `unclear`, same rule as the daily task.

**What did clear the bar — 3 chains, 206 restaurants, backfilled immediately:**
- **Franco Manca** (61 locations) — own FAQ: an optional service charge is added, 10% outside London / 12.5% inside London (recorded with `pct: null` and both rates in the note, rather than guessing which applies to a given branch).
- **Prezzo** (99 locations) — own FAQ confirms a tronc funded by "discretionary service charges left voluntarily by customers," with no fixed percentage published (`pct: null`).
- **Turtle Bay** (46 locations) — own "Fair Share Policy" page is unusually precise: automatic charge at 5 named branches (Chelmsford 12.5%, Camden/Ealing/Hammersmith/Brixton 10%), and 10% only for parties of 4+ everywhere else. Matched by branch name/address, so the 5 named locations got `charges` and the other 41 got `groups`.

Multi-brand/food-court listings (e.g. "Zizzi also trading as Coco di Mama", "Chiquito / Bao Now / Bone Jam / Kick-ass Burrito") were excluded throughout — can't be sure which brand's policy actually applies at that table, so no guess was made there either. All 206 inserts went through the same `insert_researched_report` RPC as everything else (publishable key only), confirmed zero pre-existing reports on any of the 206 before writing (so nothing overwrote a diner report), and were spot-checked live afterward.

**Made self-healing, not just a one-off:** `src/lib/chain-policies.ts` holds these 3 policies (same shape the original project plan sketched, just shorter than hoped), and `scripts/sync-fhrs.ts` now re-checks every active restaurant against it on every weekly sync run, inserting a researched report for any zero-report match — so a newly-opened Franco Manca, Prezzo, or Turtle Bay branch gets covered automatically going forward, no manual backfill needed. Adding a 4th chain later is a matter of adding one entry to that file with a real citable source, nothing else. Verified via `npx tsc --noEmit`, `npm run lint`, and a standalone check of `matchChainPolicy()` against real sample rows (all 3 chains, the Turtle Bay branch split, and known combo-listing/false-positive cases) before pushing — worth running the GitHub Actions workflow once with `dry_run: true` (Actions tab → FHRS weekly sync → Run workflow) to see the real "N chain-policy matches" count against production before the next scheduled Monday run applies it live.

**4th chain added: TGI Fridays (15 clean branches, backfilled immediately)** — sourced by you, from their own published menu PDF: a discretionary 10% service charge for groups of 7+, 100% to staff (recorded as `groups`, `pct: 10`). Their FHRS listings turned out to be the messiest yet — the same physical restaurant is often listed bundled with in-house delivery sub-brands ("Conviction Chicken", "Byron Burger", "Mother Clucker", "Liberty Desserts") under wildly inconsistent punctuation (commas, ampersands, slashes, parentheses, or no punctuation at all), most of which the existing `isComboListing()` slash/"t/a" check didn't catch. Rather than risk applying a dine-in service-charge note to a listing that might really be a delivery-only sub-brand, `ChainPolicy` gained an optional `matches` override (used only by TGI Fridays) that requires the name to be *just* one of the "TGI Fridays" spellings with nothing else left over — verified against the real FHRS name list (11 punctuation/spelling variants) before pushing, including the false-positive "TGI Catering" (an unrelated stadium caterer) correctly not matching. Of ~41 active FHRS rows containing "tgi", only 15 were clean enough to match; the other 26 are left alone under the same no-guessing rule as any other ambiguous listing. Confirmed zero pre-existing reports on all 15 before inserting.

**5th chain added: Miller & Carter (119 branches, backfilled immediately)** — also sourced by you, from their own online table-booking terms: a discretionary 10% service charge for tables of 8+ (`groups`, `pct: 10`). Much simpler than TGI Fridays — every one of their ~119 active FHRS listings is a single-brand "Miller & Carter"/"Miller And Carter" name (plus an optional branch-name suffix, e.g. "Miller & Carter Exeter"), no food-court bundling — so the match rule is just "name contains both 'miller' and 'carter'", verified against all 119 real rows (100% matched) plus a few plausible false-positive names ("Millers Fish Bar", "The Miller Arms") to confirm those correctly don't match. Confirmed zero pre-existing reports on all 119 before inserting — this is the single biggest chain backfill of the project so far.

## Fixed — `/api/search` was unreliable for some queries (root cause: missing index)

Discovered while resolving restaurant IDs for the round-2 insert above. Initially misdiagnosed twice — first as a caching problem (wrong: this Next.js version's Route Handlers aren't cached by default, and response headers confirmed `x-vercel-cache: MISS` on every request including the failing ones), then suspected as a Vercel-function-timeout/Supabase-compute issue (unconfirmed guess, superseded below).

**Root cause, confirmed via `EXPLAIN (ANALYZE, BUFFERS)` in the Supabase SQL editor:** `restaurants` had `pg_trgm` GIN indexes on `name` (`idx_restaurants_name_trgm`) and `area` (`idx_restaurants_area_trgm`), but **not on `postcode`**. `searchRestaurants()`'s three-column `ILIKE` OR always touches all three columns, so any query whose `postcode` branch got evaluated forced a full, unindexed scan — didn't complete in 60+ seconds in testing. The same query with the `postcode` condition removed ran in ~21ms.

**Fix:** added the missing index —

```sql
create index concurrently idx_restaurants_postcode_trgm
  on restaurants using gin (postcode gin_trgm_ops);
```

Verified after creation: the full three-column query (postcode included) dropped to ~34ms via `EXPLAIN ANALYZE`, using a proper Bitmap Heap Scan instead of a sequential scan. Live-endpoint testing confirmed the fix end-to-end: `/api/search?q=condesa` and `?q=mambow` both now return correct, complete results with a fast TTFB (well under 100ms) on real page navigations, and the on-site search box correctly surfaces both the Westminster and Bristol "Condesa" rows (the latter showing its researched "Adds charge" status) with no delay. (One earlier round of testing this session, via a fetch issued into a background browser tab, still appeared to hang after the index was created — that turned out to be a stuck automation tab, not a server-side issue; `pg_stat_activity` showed no active or blocked queries at the time, and fresh navigations/tabs worked immediately.)

**Practical impact of the original bug:** affected real diner-submitted reports too, not just research batches — a report submitted for a restaurant whose exact search term hit the unindexed postcode path could appear to fail or hang for that visitor, unrelated to whether the report actually saved. Resolved now that every column in the search OR is indexed.

## Fuzzy (typo-tolerant) search — fully live

Search was already reasonably forgiving (per-word substring matching across name/area/postcode, order-independent), but a genuine typo — "wagammma" instead of "Wagamama" — returned nothing, since ILIKE still requires an exact substring. You asked for this to be blended in always, not just as a "no results" fallback, so a slightly misspelled query gets ranked results immediately rather than a second empty-state step.

**How it's ranked:** a Postgres function, `search_restaurants_ranked(search_words, allowed_ids)`, scores each restaurant per search word as the best of: an exact substring match (scores 1.0 — the max, skipping the `similarity()` call entirely when it already applies) or a `pg_trgm` similarity score (0–1) against name/area/postcode, then sums those per-word scores. Every word still has to match *something* for a restaurant to qualify at all (same AND-across-words behavior the search already had) — fuzzy just widens what counts as "matching" a given word, it doesn't loosen the requirement that every word matches. Because an exact substring always scores the per-word maximum, a restaurant that matches exactly can never be outranked or buried by a fuzzy-only match for the same word — so normal (non-typo) searches look identical to the old ranking, just with typo tolerance added on top. Uses the `%` similarity operator (index-accelerated by the same `pg_trgm` GIN indexes on name/area/postcode from the fix above) in the `WHERE` clause, not a raw `similarity()` call, so it isn't a full table scan.

`searchRestaurants()` in `src/lib/data.ts` calls this RPC to get a ranked, capped (200) list of restaurant ids, then fetches the full rows (with nested reports) for just those ids and restores the RPC's rank order client-side, since PostgREST's `.in()` doesn't preserve input order. The status-filter allowlist (see the "Fixed" section above this one) is passed straight into the RPC as `allowed_ids`, so a status chip + typo'd search term still combine correctly. Text-less browsing (a status chip with an empty search box) is unchanged — no ranking needed when there's no query to rank against, so that path still just pages the table alphabetically.

I ran and iterated on this SQL directly in the Supabase SQL Editor (no service_role key handled by me), the same way every other migration/RPC this session went — including two rounds of debugging a real production-only performance bug, described below.

Current, working definition:

```sql
create or replace function search_restaurants_ranked(
  search_words text[],
  allowed_ids uuid[] default null
)
returns table(id uuid, score real)
language sql
stable
as $$
  select r.id,
    sum(
      greatest(
        case when r.name ilike '%' || w || '%' then 1.0 else similarity(r.name, w) end,
        case when r.area ilike '%' || w || '%' then 1.0 else similarity(r.area, w) end,
        case when r.postcode ilike '%' || w || '%' then 1.0 else similarity(r.postcode, w) end
      )
    )::real as score
  from restaurants r
  cross join unnest(search_words) as w
  where r.is_active = true
    and (allowed_ids is null or r.id = any(allowed_ids))
    and (
      r.name ilike '%' || w || '%'
      or r.area ilike '%' || w || '%'
      or r.postcode ilike '%' || w || '%'
      or r.name % w
      or r.area % w
      or r.postcode % w
    )
  group by r.id
  having count(distinct w) = coalesce(array_length(search_words, 1), 0)
  order by score desc, min(r.name) asc
  limit 200
$$;

revoke all on function search_restaurants_ranked(text[], uuid[]) from public;
grant execute on function search_restaurants_ranked(text[], uuid[]) to anon;
```

Note there's no `set pg_trgm.similarity_threshold = 0.3` and no `select set_limit(0.3)` statement anywhere — deliberately. `0.3` is `pg_trgm`'s own default threshold, so it doesn't need setting at all, and the function body is exactly one `SELECT` statement. Both of those turned out to matter a lot (see the bug below).

**Bug found and fixed: a multi-statement function body silently disabled query planning.** The very first working version of this function had `select set_limit(0.3);` as its own statement before the main `SELECT`, to force the trigram threshold (Supabase denies permission to `SET pg_trgm.similarity_threshold` directly, even for the `postgres` role — `ERROR: 42501: permission denied to set parameter`, so `set_limit()` was the workaround). That shipped, activated fine, and single-word typo queries (`?q=wagammma`) worked. But a 3-word query (`?q=flat%20iron%20westminster`) started failing live with `{code: '57014', message: 'canceling statement due to statement timeout'}` in Vercel's Runtime Logs — reproducible every time in production, but the *identical* RPC call ran fine in the SQL Editor. Root cause, found via `EXPLAIN (ANALYZE, BUFFERS)`: a Postgres SQL function can only be **inlined** by the planner (folded into the outer query so it can use indexes properly) when its body is a single `SELECT` statement. The extra `select set_limit(0.3)` statement made it two statements, so Postgres ran it as an opaque black box instead — `EXPLAIN` showed a bare `Function Scan` with no visibility into the real plan, and execution time for the 3-word query was **5,962ms**. Removing that statement (safe, since 0.3 is already the default) dropped it to **993ms** — `EXPLAIN` now shows a proper inlined `Subquery Scan` using the `idx_restaurants_*_trgm` indexes. Separately restructured the per-word scoring to skip the `similarity()` call entirely when the cheap `ILIKE` substring match already gives the max score (1.0), which helped further. Verified the ranking itself is unaffected throughout — `?q=flat%20iron%20westminster` still returns the same 5 branches at score 3 each, before and after.

**Resolved: `anon`'s `statement_timeout` needed raising, and the change needed a project restart to reach already-open pooled connections.** Even at ~1 second in the SQL Editor, the 3-word query was still timing out live for a while after the inlining fix — turned out `anon`'s Postgres role had `statement_timeout=3s` (vs. `authenticated`'s `8s`), and the real production/pooled connection path (through Supabase's connection pooler) has enough overhead on top of raw query time that multi-word queries were riding right at that edge — both successful and failing requests took a strikingly consistent ~3.3–3.4s wall-clock, which doesn't match the sub-second times measured directly. Ran, with your explicit go-ahead: `alter role anon set statement_timeout = '8s';` (matches `authenticated`, confirmed applied via `select rolconfig from pg_roles where rolname = 'anon'`). That's a session-level Postgres GUC — it only takes effect for *new* backend connections, not ones already open in the pool — so live testing right after the change still showed the old 3s behaviour for multi-word queries, and the pool didn't cycle on its own within ~25 minutes of waiting. With your go-ahead, restarted the Supabase project (Project Settings → General → Project availability → Restart project) to force every pooled connection to pick up the new timeout immediately. Confirmed fixed straight after: `flat iron westminster` and `pizza express london` both return live, fast results (no 500/timeout) via the on-site search box.

Single-word typo queries (`?q=wagammma`, `?q=nandos`) and multi-word queries (`flat iron westminster`) both work reliably in production now, confirmed via the live search box after the restart.

## Public-readiness security hardening — done

Before opening the site up more widely, a "what could go wrong if a stranger poked at this" pass turned up a real gap, fixed live:

**Anon could fabricate restaurant listings — fixed.** The `public insert restaurants` RLS policy only checked field lengths (e.g. `name <= 80` chars), not whether the request came from anywhere legitimate. Verified live with a direct `curl` POST to the Supabase REST endpoint using the public/publishable key: it succeeded (`201`), creating a fake restaurant row anyone on the internet could have done the same with. **Fixed** by dropping that policy entirely — restaurants can now only ever be created by the FSA sync (`scripts/sync-fhrs.ts`), which uses the offline `service_role` key, never the app's public key. Verified the fix live: the same probe request now gets `401`/RLS-violation. The test row was cleaned up via the SQL editor (a direct anon `DELETE` silently no-ops — no anon DELETE policy exists on this table — so it had to run as the `postgres` role instead).

App-level defense in depth: `addReport()`/the report-submission path used to create a restaurant on the fly if the submitted area/slug didn't match an existing one — confirmed via `AddReportForm.tsx` that the real UI never needs this (the form always renders on an existing restaurant's own page with its slug/area already known, never free-typed), so this was pure unused attack surface. Removed; submitting a report for an unknown restaurant now cleanly 404s instead of silently creating one.

**In-memory rate limiting replaced with a real, DB-backed one.** The old `/api/reports` rate limit was a plain in-memory `Map` — reset on every cold start/deploy and not shared across serverless instances, so it was only ever a soft speed bump, not a real limit. Replaced with the same pattern already used elsewhere in this project (`insert_researched_report`): a `SECURITY DEFINER` Postgres function, `submit_diner_report`, that does everything atomically and DB-side — validates status/pct/note, looks up the restaurant by `area_slug`+`slug` (never creates one), enforces a real 30-second per-IP cooldown via a new `diner_report_rate_limit` table, and inserts the report. Granted only to `anon`; the table itself has RLS enabled with no anon policies at all, so only the function (which bypasses RLS as its owning role) can touch it. The app (`src/lib/data.ts`: `submitDinerReport()`, plus `RestaurantNotFoundError`/`RateLimitedError`) and the API route (`src/app/api/reports/route.ts`) were both updated to call it; the old in-memory `Map` is gone.

Once `submit_diner_report` existed, the *old* direct-insert `public insert reports` policy was still live — meaning anyone could bypass the new rate limiter entirely by POSTing straight to the REST endpoint instead of calling the RPC (proven via curl: still `201` after the RPC was live). **Fixed** by dropping that policy too. Verified: direct insert now `401`s, the RPC still works fine (`200`) from a different IP, and a same-IP RPC call within 30 seconds correctly gets rejected as rate-limited.

**Migration applied** (Supabase SQL editor):
```sql
drop policy if exists "public insert restaurants" on restaurants;

create table if not exists diner_report_rate_limit (
  ip text primary key,
  last_submitted_at timestamptz not null default now()
);
alter table diner_report_rate_limit enable row level security;

create or replace function submit_diner_report(
  p_area_slug text, p_slug text, p_status text,
  p_pct numeric, p_note text, p_ip text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_restaurant_id uuid; v_last timestamptz; v_report_id uuid;
begin
  if p_status not in ('charges','no-charge','groups','unclear') then
    raise exception 'invalid status';
  end if;
  if p_note is not null and char_length(p_note) > 220 then
    raise exception 'note too long';
  end if;
  if p_pct is not null and (p_pct < 0 or p_pct > 100) then
    raise exception 'invalid percentage';
  end if;
  if p_ip is null or char_length(p_ip) = 0 or char_length(p_ip) > 64 then
    raise exception 'invalid ip';
  end if;

  select id into v_restaurant_id from restaurants
    where area_slug = p_area_slug and slug = p_slug;
  if v_restaurant_id is null then
    raise exception 'restaurant not found';
  end if;

  select last_submitted_at into v_last from diner_report_rate_limit where ip = p_ip;
  if v_last is not null and now() - v_last < interval '30 seconds' then
    raise exception 'rate limited';
  end if;

  insert into diner_report_rate_limit (ip, last_submitted_at)
  values (p_ip, now())
  on conflict (ip) do update set last_submitted_at = now();

  insert into reports (restaurant_id, status, pct, note, source, source_url, report_date)
  values (v_restaurant_id, p_status, p_pct, p_note, 'diner', null, current_date)
  returning id into v_report_id;

  return v_report_id;
end;
$$;

revoke all on function submit_diner_report(text, text, text, numeric, text, text) from public;
grant execute on function submit_diner_report(text, text, text, numeric, text, text) to anon;

drop policy if exists "public insert reports" on reports;
```

Verified via `npx tsc --noEmit` and `npm run lint` (clean) before pushing.

## Public-readiness pass, part 2 — attribution, legal, discoverability — done

Rest of the "getting ready to face the public" list, all pure app code (no DB changes):

- **FSA/OGL attribution + honest footer copy.** The old footer ("user-submitted and unverified") predated researched reports and was no longer accurate once most reports stopped being diner-submitted. New shared `src/components/SiteFooter.tsx` — used on every page (home, restaurant detail, browse-by-area, about, privacy) — credits the FSA/Open Government Licence v3.0 by name and link, explains the diner-vs-researched distinction in one line, and links to the new About and Privacy pages. Restaurant detail pages keep their own FHRS ID line separately, above the shared footer.
- **`/about`** — what the site is, where the restaurant list comes from (FSA/OGL), how a diner report differs from a researched one, and a `#correct-a-listing` section for businesses that want something fixed.
- **`/privacy`** — plain-language: no accounts, no cookies, no tracking; what a submitted report does with the note/status you enter (published immediately, so nothing you wouldn't want public); that an IP address is recorded only to enforce the 30-second rate limit (see `submit_diner_report` above) and never shown or used for anything else; who hosts the site (Vercel/Supabase).
- **Contact address**: both new pages originally used `thegrumblephone@gmail.com` (inferred from the `thegrumble-lab` GitHub org's git history) as a placeholder — now superseded, see "Rebrand, domain, and email" below.
- **`robots.ts` + `sitemap.ts`.** With ~184k restaurant pages, a single sitemap would badly exceed Google's 50,000-URL-per-file cap, so it's sharded via Next's `generateSitemaps()` — shard size and count live in one shared helper (`src/lib/sitemap-shards.ts`) so `sitemap.ts` and `robots.ts` can never disagree about how many shards exist or drift out of sync as the dataset grows. Shard 0 also carries the home/about/privacy pages and all area pages; every other shard is restaurants only, fetched with the same `.range()` paging pattern used elsewhere in this codebase to avoid PostgREST's silent row-cap truncation. `robots.ts` disallows `/api/` and lists every shard.
- **Open Graph / Twitter card metadata.** `layout.tsx` gained `metadataBase`, `openGraph`, and `twitter` (`summary_large_image`) blocks. The share-card image itself (`src/app/opengraph-image.tsx`, reused by `twitter-image.tsx`) is generated at request time via `next/og`'s `ImageResponse` — a simple card in the site's own paper/purple palette, no external font fetch — verified by running it through `next dev` and rendering the actual output PNG.
- **`src/lib/site.ts`** — new single `SITE_URL` constant (defaults to the current Vercel URL, overridable via `NEXT_PUBLIC_SITE_URL`) used by the sitemap, robots, and OG metadata, so switching to a real domain later is a one-line change plus setting that env var.
- `src/lib/supabase.ts`'s doc comment was also out of date (still described restaurants as anon-insertable) — corrected to match the RLS changes above.

Verified via `npx tsc --noEmit` and `npm run lint` (clean); `/opengraph-image` spot-checked by rendering the real output through a local `next dev` server.

## Error monitoring — live and confirmed working (Sept 2026)

You asked for real error monitoring rather than only finding out about a production break by checking Vercel's logs yourself. Went with Sentry — the standard choice for Next.js, official SDK, free tier (~5k errors/month) with email alerts out of the box.

**Built**, via `@sentry/nextjs` following its current App Router setup (this project uses a `src/` directory, so Sentry's instrumentation files live there rather than at the repo root):
- `src/instrumentation-client.ts` — browser-side error/session capture.
- `src/sentry.server.config.ts` / `src/sentry.edge.config.ts` — server-side, split by runtime.
- `src/instrumentation.ts` — wires the two above into Next's `register()`/`onRequestError` hooks.
- `src/app/global-error.tsx` — catches errors that would otherwise escape every boundary, including the root layout.
- `next.config.ts` — wrapped with `withSentryConfig` (org/project/auth-token all read from env vars, so source-map upload is skipped harmlessly until those exist).

**Configured and verified live.** DSN/org/project were set as `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` in the Vercel project's environment variables, and the site redeployed to pick them up. Proof it works: minutes after going live, it caught a real production bug on its own — see "getAreas() statement timeout" below. `SENTRY_AUTH_TOKEN` (for readable, non-minified stack traces) is still not set — optional, skipped for now; errors land fine either way, just with minified line numbers.

**Known gap:** server-side errors (Server Components, Route Handlers, Server Actions — i.e. `onRequestError`) are confirmed reaching Sentry. Deliberately-triggered client-side (browser) errors, during this same verification session, consistently got a `503` back from Sentry's ingest endpoint instead of being accepted — worth another look if a real browser-side error doesn't show up in the dashboard when you'd expect one. Not yet root-caused; could be Sentry-side, could be something in how the test was triggered.

## Rebrand, domain, and email (Sept 2026)

Renamed the project from "Do They Charge?" to **Discretionary**, off the back of a naming discussion (SEO/collision risk, brand memorability) that landed on "Discretionary" — short, ownable, and reads naturally with the tagline ("It's all... Discretionary."). Rebrand touched every page title/metadata, the OG image, breadcrumbs, hero copy on the homepage (`.tagline-buildup` in `globals.css` + `page.tsx`), and `SITE_URL`'s default. Shipped and verified live via the deployed site's title tag.

**Domain**: you registered `discretionary.uk` and an accompanying Microsoft 365 email seat, both via GoDaddy. Connected to Vercel:
- Added `discretionary.uk` and `www.discretionary.uk` as custom domains on the Vercel project.
- Vercel defaulted the apex to redirect to `www` — flipped that so the bare apex (`discretionary.uk`) is canonical instead, matching how you've referred to the brand throughout ("discretionary.uk", never "www.discretionary.uk"). Both domains now serve Production.
- Updated GoDaddy's DNS: apex `A` record → Vercel's IP (`216.198.79.1`), `www` `CNAME` → Vercel's dynamic target. Both saved successfully in GoDaddy; DNS propagation can take a little time to fully resolve everywhere.
- `NEXT_PUBLIC_SITE_URL` set explicitly in Vercel's Environment Variables (`https://discretionary.uk`), on top of the code default in `src/lib/site.ts`, so the sitemap/robots/OG tags are unambiguous.

**Email**: created `hello@discretionary.uk` as the new mailbox (Microsoft 365, via GoDaddy's "Email & Office" setup wizard — domain, username, and account details filled in; the password itself was entered by you directly, never by me, per how I handle credentials). It's now live as the site's public contact address, replacing the placeholder `thegrumblephone@gmail.com` in `/about` and `/privacy`.

## Search missed "kings arms berkhamsted", then a fix for that broke search sitewide, then a Supabase capacity scare that turned out to be ClaudeBot (Sept 2026)

Three linked incidents in one session, worth reading in order because each one's fix caused the next problem.

1. **"kings arms berkhamsted" returned nothing**, even though the pub is a real, active listing you'd been to the weekend before. Cause: the FSA data files it under local authority "Dacorum", not "Berkhamsted" — the town only appears in the `address` column, which `search_restaurants_ranked()` (the Postgres RPC behind `/api/search`, see the "Fuzzy + exact search" comment in `src/lib/data.ts`) never checked at all. **Fix**: added `address` to the function, with both an exact ILIKE substring check and a `pg_trgm` fuzzy `similarity()` check, matching how `name`/`area`/`postcode` were already handled, plus a new `idx_restaurants_address_trgm` GIN index. Applied directly via the Supabase SQL Editor (no migration files in this repo — every schema change this project has made has gone in the same way).
2. **That fix broke every multi-word search sitewide** — confirmed via Vercel's function logs (the client only ever saw a generic `{"error":"Search failed."}` 500, so the real cause, Postgres error `57014` "canceling statement due to statement timeout", was invisible without checking server-side logs). Root cause: `address` is long free text, and computing `similarity()` against it per search word, per row, was expensive enough to blow the ~8s statement timeout on the `anon` role for any 2+ word query. **Fix**: rewrote the function again to drop the fuzzy/`%`-similarity check on `address` specifically while keeping the fast ILIKE substring check (which the existing trigram index still accelerates) — verified fast via `EXPLAIN ANALYZE`. The updated comment in `src/lib/data.ts` documents both the `address` addition and why it's substring-only.
3. **Even after that fix, live search kept timing out** (8–9.5s, still `57014`), and the Supabase dashboard was itself sluggish to the point of being hard to work in. Checked the project's usage page: **12.57 GB of egress against a 5 GB Free-tier quota (251%)** for the current billing cycle — Supabase's own dashboard warns of "restrictions" past that point, consistent with the general slowness. You asked what the cheapest paid plan would cost (Pro, $25/month, would comfortably cover this — 250 GB egress, dedicated Micro compute, no inactivity pause) but said not to spend that yet, and to curb whatever was driving the usage instead.
   - Traced the load to **ClaudeBot** (Anthropic's own crawler, user-agent confirmed via Vercel request logs — a legitimate, `robots.txt`-respecting crawler, not a hostile scraper) systematically sweeping every one of the site's ~363 `/browse/<area>` pages roughly **once every 9 seconds** — fast enough to complete a full lap of all 363 areas in under the hour those pages' ISR `revalidate` window allowed, meaning almost every one of those hits was a guaranteed cache miss forcing a fresh Supabase round-trip, all day, continuously.
   - Along the way, one specific request (`/browse/vale-of-glamorgan`) looked like a much scarier bug in isolation: Vercel's log detail panel showed 35.55s execution, 738MB memory, and roughly 100 sequential REST calls to the `restaurants` table for a single page render — which would imply a serious pagination bug in `getRestaurantsByArea()` (`src/lib/data.ts`), since that area only has 349 restaurants (a single page, one call, confirmed via `select count(*) from restaurants where area_slug = 'vale-of-glamorgan'`). Investigated properly rather than assuming: pulled up a second concurrent log entry from the same time window (`/browse/newark-and-sherwood`) and it showed the *same* 738MB and a 29.82s duration while reporting **zero** external API calls of its own. That's decisive — Vercel's Fluid Compute shares a worker instance across concurrent invocations, and its per-request "External APIs"/memory panel reflects everything happening on that shared worker, not just the one logged request. With ClaudeBot hammering a new area every ~9 seconds, several concurrent renders land on the same worker and get their metrics comingled in the UI. **There is no pagination bug** — `getRestaurantsByArea()` is fine; the alarming-looking log entry was an artifact of concurrent crawl volume, not a code defect.
   - **Fix, two parts, both shipped in this session:**
     - `src/app/robots.ts`: added a `ClaudeBot`-specific rule with `crawlDelay: 30` (Anthropic's own crawler docs confirm ClaudeBot honours `Crawl-delay` — [support.claude.com/articles/8896518](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)), rather than blocking it outright — it's a legitimate crawler and blocking would be a bigger, more one-sided call than a cost problem alone justifies.
     - `revalidate` on both `src/app/browse/[areaSlug]/page.tsx` and `src/app/[area]/[slug]/page.tsx` widened from `3600` (1 hour) to `21600` (6 hours) — content here (FSA sync data, occasional diner reports) doesn't change fast enough to need hourly freshness, and a longer window means even the throttled crawl rate can't outrun the cache.
   - Not yet done, worth checking in a few days: confirm the Supabase egress/usage graph has actually flattened out post-deploy, and that the SQL Editor/dashboard feels responsive again. If usage is still climbing, the next lever is a tighter `crawlDelay` or scoping ClaudeBot's `disallow` to just `/browse/` (individual restaurant pages are cheap single-row lookups and already fully enumerated in the sitemap, so bots don't need the listing pages to discover them) before revisiting the Pro plan.

## What's left (only things that need your input)

1. **Confirm `discretionary.uk` has fully propagated and Vercel shows it as valid** — DNS records were just corrected; give it a little time if Vercel's domain status hasn't flipped to "Valid Configuration" yet.
2. **Moderation — decided: leave auto-publish as-is.** Every report (diner-submitted or automated) still auto-publishes instantly, no review step. Revisited explicitly once the daily task started producing ~120 unattended candidate-checks a day (not just a handful of manually-checked pilot restaurants) — your call was to keep auto-publish, on the basis that the citation discipline (own-site-only, never guessed, skip rather than guess) is the real safeguard, and it's held up cleanly across ~550 inserts so far with no known bad entries. Revisit if that stops being true.
3. ~~Minor future optimization, not urgent~~ — **turned out to be a real bug, now fixed.** `getAreas()` fetches every `(area_slug, area)` pair, paginated, and aggregates counts in JS. It was paginating with `.range()` (OFFSET-based) — fine at small scale, but at ~184k rows and ~184 pages that's O(n²) work in Postgres (each page re-scans and discards everything before its offset). Sentry caught this live in production, days after going in: `"canceling statement due to statement timeout"` (Postgres error `57014`) on `GET /`, meaning a real visitor hit a failed homepage render. Fixed by switching to keyset pagination (`order by id`, `.gt("id", cursor)` instead of `.range()`), which seeks via the primary-key index on every page regardless of depth — cost stays flat instead of growing with table size. Verified: clean `tsc`/`lint`, and the live homepage now correctly shows 363 areas / 183,798 restaurants with no timeout. Worth remembering as a pattern: anything that pages through the *whole* table should use a cursor, not `.range()`, once it's this size.

## Running it yourself in the meantime

```
npm install
npm run dev
```

Then open `http://localhost:3000`.
