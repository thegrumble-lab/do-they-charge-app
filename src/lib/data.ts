import { supabase } from "./supabase";
import { getPgPool } from "./db";
import { Restaurant, Report, ReportStatus, latestReport } from "./types";

/**
 * DATA LAYER — backed by Supabase (Postgres), via the anon key + RLS
 * policies described in supabase.ts. Every function here is async; every
 * call site awaits it. Loaded with the full 140,921-restaurant national
 * FSA dataset (see HANDOFF.md). Any query over an unbounded set of rows
 * needs an explicit paginated loop rather than a bare select — PostgREST
 * silently caps unranged queries (see getRestaurantsByArea() below for the
 * pattern, and HANDOFF.md for the bug that pattern fixed). Prefer keyset
 * pagination (order by id, `.gt("id", cursor)`) over `.range()`/OFFSET for
 * anything that pages through the whole table — OFFSET pagination gets
 * quadratically slower deep into a large table.
 *
 * For anything that needs to aggregate across the whole table (counts,
 * grouping) rather than list rows, prefer a Postgres RPC — see
 * getAreas()/get_area_summaries() below, and HANDOFF.md, for why paging
 * ~184k rows into JS just to count them by area was a real production
 * problem, not just a style preference.
 */

interface DbReport {
  id: string;
  status: ReportStatus;
  pct: number | null;
  note: string;
  source: "seed" | "diner" | "researched";
  source_url: string | null;
  report_date: string;
  created_at?: string;
}

interface DbRestaurant {
  id: string;
  fhrsid: string | null;
  area_slug: string;
  slug: string;
  name: string;
  area: string;
  address: string;
  postcode: string;
  lat: string | null;
  lng: string | null;
  is_active: boolean;
  hygiene_rating?: string | null;
  hygiene_rating_date?: string | null;
  hygiene_scheme?: string | null;
  reports?: DbReport[];
}

const RESTAURANT_COLUMNS =
  "id, fhrsid, area_slug, slug, name, area, address, postcode, lat, lng, is_active, " +
  "hygiene_rating, hygiene_rating_date, hygiene_scheme";
const RESTAURANT_WITH_REPORTS_SELECT = `${RESTAURANT_COLUMNS}, reports(id, status, pct, note, source, source_url, report_date, created_at)`;

function toRestaurant(row: DbRestaurant): Restaurant {
  const reports = (row.reports ?? [])
    .slice()
    .sort((a, b) => {
      const byDate = a.report_date.localeCompare(b.report_date);
      if (byDate !== 0) return byDate;
      return (a.created_at ?? "").localeCompare(b.created_at ?? "");
    })
    .map(
      (r): Report => ({
        id: r.id,
        status: r.status,
        pct: r.pct,
        note: r.note,
        source: r.source,
        sourceUrl: r.source_url,
        date: r.report_date,
      })
    );

  return {
    id: row.id,
    areaSlug: row.area_slug,
    slug: row.slug,
    name: row.name,
    area: row.area,
    address: row.address ?? "",
    postcode: row.postcode ?? "",
    lat: row.lat,
    lng: row.lng,
    fhrsid: row.fhrsid ?? "",
    isActive: row.is_active,
    hygieneRating: row.hygiene_rating ?? null,
    hygieneRatingDate: row.hygiene_rating_date ?? null,
    hygieneScheme: row.hygiene_scheme ?? null,
    reports,
  };
}

export async function getRestaurantBySlug(
  areaSlug: string,
  slug: string
): Promise<Restaurant | undefined> {
  const { data, error } = await supabase
    .from("restaurants")
    .select(RESTAURANT_WITH_REPORTS_SELECT)
    .eq("area_slug", areaSlug)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? toRestaurant(data) : undefined;
}

export async function getRestaurantsByArea(
  areaSlug: string
): Promise<Restaurant[]> {
  // Same PostgREST default row-cap issue as getAreas() below — an
  // unranged query silently truncates once an area has more restaurants
  // than the cap (seen live: Tower Hamlets was being cut off at exactly
  // 1,000). Page through with .range() instead of one unranged select.
  const PAGE_SIZE = 1000;
  const restaurants: Restaurant[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("restaurants")
      .select(RESTAURANT_WITH_REPORTS_SELECT)
      .eq("area_slug", areaSlug)
      .eq("is_active", true)
      // Ordered by name for display, then by id to break ties. The id is
      // what makes the pagination safe: ordering by a non-unique column
      // alone leaves rows with equal names free to swap places between
      // pages, which duplicates some and skips others.
      .order("name")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    restaurants.push(...(data ?? []).map(toRestaurant));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return restaurants;
}

export async function searchRestaurants(
  query: string,
  status: string
): Promise<Restaurant[]> {
  // A status filter (e.g. "no-charge") has to be resolved against each
  // restaurant's *latest* report — and PostgREST has no way to express
  // "latest row per group" as a single filtered query. The previous
  // approach fetched an unrelated page of restaurants (the 200 that sort
  // first by name, or first by name within a text match) and only *then*
  // filtered that page by status in JS. With no text query, that meant a
  // status-only chip click was filtering the alphabetically-first 200
  // restaurants out of ~184k nationwide — restaurants with a matching
  // status essentially never landed in that arbitrary slice, so the
  // filter silently returned nothing for most statuses (caught when the
  // "researched" pilot restaurants, scattered randomly across the whole
  // table, didn't show up under any status filter at all).
  //
  // The reports table is small (order of hundreds of rows — most
  // restaurants have no reports at all; see HANDOFF.md), so it's cheap to
  // pull the whole thing, compute latest-per-restaurant in JS, and turn a
  // status filter into an explicit restaurant-id allowlist *before*
  // querying restaurants — pushing the real filtering to something that
  // actually covers every restaurant, not just a name-sorted page of one.
  let restaurantIdFilter: string[] | null = null;
  if (status !== "all") {
    const { data: allReports, error: reportsError } = await supabase
      .from("reports")
      .select("restaurant_id, status, report_date, created_at")
      .order("restaurant_id")
      .order("report_date")
      .order("created_at");
    if (reportsError) throw reportsError;

    const latestByRestaurant = new Map<string, { status: string }>();
    for (const r of allReports ?? []) {
      // Rows arrive grouped by restaurant_id and sorted oldest-to-newest
      // within each group (matching the sort in toRestaurant()/
      // latestReport()), so the last .set() per restaurant_id wins.
      latestByRestaurant.set(r.restaurant_id, r);
    }

    restaurantIdFilter = Array.from(latestByRestaurant.entries())
      .filter(([, r]) => r.status === status)
      .map(([id]) => id);

    if (restaurantIdFilter.length === 0) return [];
  }

  // Split into words and require each one to match name, area or postcode
  // — but not necessarily the same column for every word. Without this, a
  // query like "flat iron westminster" (restaurant name "Flat Iron" +
  // area "Westminster") was matched as one whole substring against each
  // column individually, which never matches when the name and the area
  // are different words.
  const words = query
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[%,()]/g, ""))
    .filter(Boolean)
    .slice(0, 8);

  if (words.length === 0) {
    // Browse mode (status chip only, no text typed) — nothing to rank, so
    // skip the fuzzy RPC entirely and just page the (optionally
    // status-filtered) table alphabetically, same as before.
    let builder = supabase
      .from("restaurants")
      .select(RESTAURANT_WITH_REPORTS_SELECT)
      .eq("is_active", true);
    if (restaurantIdFilter) {
      builder = builder.in("id", restaurantIdFilter);
    }
    const { data, error } = await builder.order("name").limit(200);
    if (error) throw error;
    return (data ?? []).map(toRestaurant);
  }

  // Fuzzy + exact search, blended: search_restaurants_ranked() (see
  // HANDOFF.md for the SQL) matches each word against name/area/postcode
  // either by substring (ILIKE) or by pg_trgm similarity, and scores each
  // restaurant by the best match per word, summed across words. An exact
  // substring always scores 1.0 for that word — the maximum — so a typo
  // ("wagammma") can surface "Wagamama" without ever outranking or
  // burying a restaurant that matches exactly. Every word still has to
  // match *something* (exact or fuzzy) for a restaurant to qualify at
  // all, same AND-across-words behavior as before.
  //
  // address is also checked (added after "kings arms berkhamsted" failed
  // to match anything — the FSA data files that pub under local authority
  // "Dacorum", not "Berkhamsted", so only the address column has the
  // town). It's substring (ILIKE) only, not fuzzy similarity: address is
  // long free text, and computing pg_trgm similarity() against it per
  // word, per row, was expensive enough to blow Postgres's statement
  // timeout on every multi-word query sitewide — a regression caught and
  // reverted the same day. See HANDOFF.md.
  //
  // Note: chaining multiple .or() calls does NOT and them together — each
  // call sets the same "or" query param, so only the last one actually
  // took effect (an earlier, since-replaced version of this function hit
  // that; PostgREST filter syntax can't express this ranked/blended query
  // at all, hence the RPC).
  // Historically this went through PostgREST: supabase.rpc(
  // "search_restaurants_ranked", ...) followed by a second .in(orderedIds)
  // query to fetch full rows, reordered client-side (PostgREST's .in()
  // doesn't preserve input order). That worked, but PostgREST's own
  // request-handling layer adds a consistent ~3-5s delay on this specific
  // RPC shape — confirmed (via HANDOFF.md's diagnosis) to be nothing to do
  // with the query itself, RLS, compute tier, region, or plan caching.
  // Connecting straight to Postgres (via db.ts's pgPool, bypassing
  // PostgREST entirely) skips that layer for this one hot path. The
  // ROW_NUMBER() preserves search_restaurants_ranked()'s own ranking order
  // through the join, so the final ORDER BY restores it — same effect as
  // the old client-side reorder, done in SQL instead.
  const { rows } = await getPgPool().query(
    `
    with ranked as (
      select id, row_number() over () as rn
      from search_restaurants_ranked($1::text[], $2::uuid[])
    )
    select
      r.id, r.fhrsid, r.area_slug, r.slug, r.name, r.area, r.address,
      r.postcode, r.lat, r.lng, r.is_active,
      r.hygiene_rating, r.hygiene_rating_date, r.hygiene_scheme,
      coalesce(
        (
          select json_agg(json_build_object(
            'id', rep.id,
            'status', rep.status,
            'pct', rep.pct,
            'note', rep.note,
            'source', rep.source,
            'source_url', rep.source_url,
            'report_date', rep.report_date,
            'created_at', rep.created_at
          ))
          from reports rep
          where rep.restaurant_id = r.id
        ),
        '[]'
      ) as reports
    from ranked
    join restaurants r on r.id = ranked.id
    order by ranked.rn
    `,
    [words, restaurantIdFilter]
  );
  if (rows.length === 0) return [];

  return (rows as DbRestaurant[]).map(toRestaurant);
}

/**
 * A random handful of restaurants that actually have a report, for the
 * homepage's default view.
 *
 * That view used to be the alphabetically-first 200 of all 183,806
 * listings — which meant, in practice, 200 consecutive rows of "No
 * reports yet", since only ~528 listings have an answer at all and none
 * of them happen to sort first by name. The shop window was advertising
 * the 99.7% of the directory we know nothing about.
 *
 * Sampling randomly rather than taking the newest also keeps the page
 * from looking static: nearly every report so far comes from the daily
 * research job rather than from diners, so "most recent" would just be
 * last night's batch in an arbitrary order. The homepage's ISR window
 * (`revalidate`) decides how often the sample actually changes.
 *
 * Starts from `reports` rather than filtering `restaurants`, so the
 * random ordering happens over the few hundred rows that qualify instead
 * of the whole table.
 */
export async function getSampleOfReportedRestaurants(
  limit = 50
): Promise<Restaurant[]> {
  const { rows } = await getPgPool().query<DbRestaurant>(
    `with reported as (
       select distinct restaurant_id from reports
     )
     select r.id, r.fhrsid, r.area_slug, r.slug, r.name, r.area, r.address,
            r.postcode, r.lat, r.lng, r.is_active,
            r.hygiene_rating, r.hygiene_rating_date, r.hygiene_scheme,
            coalesce(
              (select json_agg(json_build_object(
                 'id', rep.id, 'status', rep.status, 'pct', rep.pct,
                 'note', rep.note, 'source', rep.source,
                 'source_url', rep.source_url, 'report_date', rep.report_date,
                 'created_at', rep.created_at
               ))
               from reports rep where rep.restaurant_id = r.id),
              '[]'
            ) as reports
     from reported
     join restaurants r
       on r.id = reported.restaurant_id
      and r.is_active
     order by random()
     limit $1`,
    [limit]
  );

  return rows.map(toRestaurant);
}

export async function getRestaurantCount(): Promise<number> {
  const { count, error } = await supabase
    .from("restaurants")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);
  if (error) throw error;
  return count ?? 0;
}

export interface AreaSummary {
  areaSlug: string;
  area: string;
  count: number;
}

export async function getAreas(): Promise<AreaSummary[]> {
  // Used to page through the whole restaurants table client-side (1000
  // rows at a time, ~184 round-trips) just to count rows per area_slug in
  // JS — PostgREST has no group-by, so that used to be the only way to do
  // it through the table API. Each of those ~184 round-trips is a real
  // Supabase request, and this runs on every /browse/[areaSlug] view that
  // misses the ISR cache (twice per view — generateMetadata and the page
  // body each called it separately) as well as on / and the sitemap
  // routes. With crawlers (meta-externalagent, ClaudeBot, etc.) working
  // through all 363 area pages, that added up to a huge share of all
  // database load site-wide — confirmed via pg_stat_statements and a
  // Vercel trace showing a single /browse/manchester request making ~100
  // Supabase calls and taking 41s. See HANDOFF.md.
  //
  // get_area_summaries() does the grouping in Postgres itself (a single
  // sequential scan + hash aggregate, ~650ms) and returns one row per
  // area in one round-trip.
  const { data, error } = await supabase.rpc("get_area_summaries");
  if (error) throw error;
  return (
    (data ?? []) as { area_slug: string; area: string; count: number }[]
  )
    .map((r) => ({ areaSlug: r.area_slug, area: r.area, count: r.count }))
    .sort((a: AreaSummary, b: AreaSummary) => b.count - a.count);
}

/** Thrown by submitDinerReport() when the target restaurant doesn't exist. */
export class RestaurantNotFoundError extends Error {
  constructor() {
    super("Restaurant not found.");
    this.name = "RestaurantNotFoundError";
  }
}

/** Thrown by submitDinerReport() when this IP submitted too recently. */
export class RateLimitedError extends Error {
  constructor() {
    super("Rate limited.");
    this.name = "RateLimitedError";
  }
}

/**
 * Submits a diner report on an existing restaurant via the
 * `submit_diner_report` Postgres function (SECURITY DEFINER, see
 * HANDOFF.md — "Diner-report hardening"). That function does everything
 * atomically and DB-side: validates status/pct/note, looks up the
 * restaurant by areaSlug+slug (never creates one — restaurants are only
 * ever created by the FSA sync, using the service-role key), enforces a
 * 30-second per-IP cooldown via the `diner_report_rate_limit` table (a
 * real, shared-across-instances replacement for the old in-memory Map
 * this route used to use), and inserts the report. Anon has no other way
 * to write to `reports` — the old direct-insert RLS policy was dropped
 * once this function existed.
 */
export async function submitDinerReport(
  areaSlug: string,
  slug: string,
  status: ReportStatus,
  pct: number | null,
  note: string,
  ip: string
): Promise<Restaurant> {
  const { error: rpcError } = await supabase.rpc("submit_diner_report", {
    p_area_slug: areaSlug,
    p_slug: slug,
    p_status: status,
    p_pct: pct,
    p_note: note,
    p_ip: ip,
  });
  if (rpcError) {
    if (rpcError.message.includes("restaurant not found")) {
      throw new RestaurantNotFoundError();
    }
    if (rpcError.message.includes("rate limited")) {
      throw new RateLimitedError();
    }
    throw rpcError;
  }

  const full = await getRestaurantBySlug(areaSlug, slug);
  if (!full) {
    throw new Error(
      "Restaurant vanished immediately after insert — this should not happen."
    );
  }
  return full;
}

/* ------------------------------------------------------------------ *
 * Error flags + admin editing
 *
 * Visitors can flag an entry as wrong from the restaurant page; those
 * land in `report_flags` and are worked through in /admin, where a
 * report's status/percentage/note/date can be corrected.
 *
 * Flags are internal — `report_flags` has RLS on with no policies at
 * all, so the anon key can neither read nor write it. Submission goes
 * through submit_report_flag() (SECURITY DEFINER, validates input and
 * shares the diner-report per-IP cooldown); everything on the admin side
 * goes over the direct Postgres connection, which connects as `postgres`
 * and so bypasses RLS. That means the admin reads and writes below are
 * only ever reachable from server code that has already checked
 * isAdmin() — there is no public route to them.
 * ------------------------------------------------------------------ */

export interface ReportFlag {
  id: string;
  message: string;
  createdAt: string;
  reportId: string | null;
  restaurantId: string;
  restaurantName: string;
  area: string;
  areaSlug: string;
  slug: string;
}

/** Thrown by submitReportFlag() when the message fails validation. */
export class InvalidFlagError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidFlagError";
  }
}

export async function submitReportFlag(
  areaSlug: string,
  slug: string,
  message: string,
  ip: string
): Promise<void> {
  // p_suggested_status / p_suggested_pct are always null now: the form
  // used to ask what the entry *should* say and no longer does. The
  // parameters and their columns are left in place rather than migrated
  // away — they cost nothing empty, and dropping them would mean a
  // destructive migration plus a window where the deployed code and the
  // database disagree. If "suggest a correction" never comes back, they
  // can be dropped in some later tidy-up.
  const { error } = await supabase.rpc("submit_report_flag", {
    p_area_slug: areaSlug,
    p_slug: slug,
    p_message: message,
    p_suggested_status: null,
    p_suggested_pct: null,
    p_ip: ip,
  });
  if (error) {
    if (error.message.includes("restaurant not found")) {
      throw new RestaurantNotFoundError();
    }
    if (error.message.includes("rate limited")) {
      throw new RateLimitedError();
    }
    if (
      error.message.includes("message required") ||
      error.message.includes("message too long") ||
      error.message.includes("invalid status") ||
      error.message.includes("invalid pct")
    ) {
      throw new InvalidFlagError(error.message);
    }
    throw error;
  }
}

export async function getOpenFlags(limit = 100): Promise<ReportFlag[]> {
  const { rows } = await getPgPool().query<{
    id: string;
    message: string;
    created_at: Date;
    report_id: string | null;
    restaurant_id: string;
    name: string;
    area: string;
    area_slug: string;
    slug: string;
  }>(
    `select f.id, f.message, f.created_at, f.report_id, f.restaurant_id,
            r.name, r.area, r.area_slug, r.slug
     from report_flags f
     join restaurants r on r.id = f.restaurant_id
     where f.resolved_at is null
     order by f.created_at desc
     limit $1`,
    [limit]
  );

  return rows.map((row) => ({
    id: row.id,
    message: row.message,
    createdAt: new Date(row.created_at).toISOString(),
    reportId: row.report_id,
    restaurantId: row.restaurant_id,
    restaurantName: row.name,
    area: row.area,
    areaSlug: row.area_slug,
    slug: row.slug,
  }));
}

/**
 * Admin-side restaurant lookup: name/area substring match, with each
 * match's reports attached so they can be edited in place. Deliberately
 * simple and separate from searchRestaurants() — this one is about
 * finding a specific known entry to correct, not ranking results for a
 * visitor, and it includes inactive listings (which are exactly the ones
 * you might need to fix).
 */
export async function adminFindRestaurants(
  query: string,
  limit = 25
): Promise<Restaurant[]> {
  const q = query.trim();
  if (!q) return [];

  const { rows } = await getPgPool().query<DbRestaurant>(
    `select r.id, r.fhrsid, r.area_slug, r.slug, r.name, r.area, r.address,
            r.postcode, r.lat, r.lng, r.is_active,
            r.hygiene_rating, r.hygiene_rating_date, r.hygiene_scheme,
            coalesce(
              (select json_agg(json_build_object(
                 'id', rep.id, 'status', rep.status, 'pct', rep.pct,
                 'note', rep.note, 'source', rep.source,
                 'source_url', rep.source_url, 'report_date', rep.report_date,
                 'created_at', rep.created_at
               ))
               from reports rep where rep.restaurant_id = r.id),
              '[]'
            ) as reports
     from restaurants r
     where r.name ilike '%' || $1 || '%'
        or r.area ilike '%' || $1 || '%'
        or r.postcode ilike '%' || $1 || '%'
     order by r.name
     limit $2`,
    [q, limit]
  );

  return rows.map(toRestaurant);
}

export interface ReportEdit {
  status: ReportStatus;
  pct: number | null;
  note: string;
  date: string;
}

/**
 * Corrects an existing report in place and returns the page path that now
 * needs revalidating — without that, an edit wouldn't show up publicly
 * for up to six hours, since restaurant pages are cached with
 * `revalidate = 21600`.
 */
export async function adminUpdateReport(
  reportId: string,
  edit: ReportEdit
): Promise<{ areaSlug: string; slug: string }> {
  const { rows } = await getPgPool().query<{
    area_slug: string;
    slug: string;
  }>(
    `update reports rep
        set status = $2,
            pct = $3,
            note = $4,
            report_date = $5::date
      from restaurants r
      where rep.id = $1
        and r.id = rep.restaurant_id
      returning r.area_slug, r.slug`,
    [reportId, edit.status, edit.pct, edit.note, edit.date]
  );

  if (rows.length === 0) {
    throw new Error("Report not found.");
  }
  return { areaSlug: rows[0].area_slug, slug: rows[0].slug };
}

export async function adminResolveFlag(flagId: string): Promise<void> {
  const { rowCount } = await getPgPool().query(
    `update report_flags set resolved_at = now()
      where id = $1 and resolved_at is null`,
    [flagId]
  );
  if (!rowCount) {
    // Already resolved, or never existed — either way there's nothing
    // left to do, so this isn't worth failing the request over.
    return;
  }
}

export { latestReport };
