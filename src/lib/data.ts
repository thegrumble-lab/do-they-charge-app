import { supabase } from "./supabase";
import { Restaurant, Report, ReportStatus, latestReport } from "./types";
import { slugify } from "./slug";

/**
 * DATA LAYER — backed by Supabase (Postgres), via the anon key + RLS
 * policies described in supabase.ts. Every function here is async; every
 * call site awaits it. Loaded with the full 140,921-restaurant national
 * FSA dataset (see HANDOFF.md). Any query over an unbounded set of rows
 * needs an explicit .range() loop rather than a bare select — PostgREST
 * silently caps unranged queries (see getAreas() and getRestaurantsByArea()
 * below for the pattern, and HANDOFF.md for the bug that pattern fixed).
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
  reports?: DbReport[];
}

const RESTAURANT_COLUMNS =
  "id, fhrsid, area_slug, slug, name, area, address, postcode, lat, lng, is_active";
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
      .order("name")
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

  let builder = supabase
    .from("restaurants")
    .select(RESTAURANT_WITH_REPORTS_SELECT)
    .eq("is_active", true);

  if (restaurantIdFilter) {
    builder = builder.in("id", restaurantIdFilter);
  }

  // Split into words and require each one to match name, area or postcode
  // — but not necessarily the same column for every word. Without this, a
  // query like "flat iron westminster" (restaurant name "Flat Iron" +
  // area "Westminster") was matched as one whole substring against each
  // column individually, which never matches when the name and the area
  // are different words.
  //
  // Note: chaining multiple .or() calls does NOT and them together — each
  // call sets the same "or" query param, so only the last one actually
  // took effect (tried this first; broke 3+ word searches). PostgREST
  // does support arbitrarily nested and()/or() groups within a single
  // filter value, so build one nested expression instead: an outer or()
  // with a single and() child, whose children are one or() per word.
  const words = query
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[%,()]/g, ""))
    .filter(Boolean)
    .slice(0, 8);
  if (words.length > 0) {
    const perWord = words.map(
      (word) =>
        `or(name.ilike.%${word}%,area.ilike.%${word}%,postcode.ilike.%${word}%)`
    );
    builder = builder.or(`and(${perWord.join(",")})`);
  }

  const { data, error } = await builder.order("name").limit(200);
  if (error) throw error;

  return (data ?? []).map(toRestaurant);
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
  // PostgREST caps the rows returned by an unranged select (commonly at
  // 1000), which silently truncated this query once the table grew past
  // that — some areas (e.g. Tower Hamlets) were missing from the result
  // entirely, which cascaded into a 404 on their /browse/[areaSlug] page.
  // Page through the whole table with .range() so every area is counted
  // regardless of table size. This runs at most once an hour (see the
  // `revalidate` export on the pages that call it), so the extra
  // round-trips aren't on the request path for real visitors.
  const PAGE_SIZE = 1000;
  const map = new Map<string, AreaSummary>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("area_slug, area")
      .eq("is_active", true)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    for (const r of data ?? []) {
      const existing = map.get(r.area_slug);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(r.area_slug, { areaSlug: r.area_slug, area: r.area, count: 1 });
      }
    }

    if (!data || data.length < PAGE_SIZE) break;
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

/**
 * Adds a report to a restaurant, creating the restaurant record first if
 * it doesn't already exist (mirrors the artifact's "match or create"
 * behaviour — a diner can report on a place that isn't in the FSA
 * sample yet). The insert-anywhere ability is deliberately narrow: the
 * "public insert" RLS policies on both tables constrain exactly which
 * columns and values an anonymous request may write.
 */
export async function addReport(
  areaSlug: string,
  slug: string,
  name: string,
  area: string,
  report: Omit<Report, "id">
): Promise<Restaurant> {
  const finalAreaSlug = areaSlug || slugify(area);
  const finalSlug = slug || slugify(name);

  const { data: existing, error: findError } = await supabase
    .from("restaurants")
    .select(RESTAURANT_COLUMNS)
    .eq("area_slug", finalAreaSlug)
    .eq("slug", finalSlug)
    .maybeSingle();
  if (findError) throw findError;

  let restaurantId = existing?.id;

  if (!restaurantId) {
    const { data: created, error: insertError } = await supabase
      .from("restaurants")
      .insert({ area_slug: finalAreaSlug, slug: finalSlug, name, area })
      .select("id")
      .single();
    if (insertError) throw insertError;
    restaurantId = created.id;
  }

  const { error: reportError } = await supabase.from("reports").insert({
    restaurant_id: restaurantId,
    status: report.status,
    pct: report.pct,
    note: report.note,
    source: report.source,
    source_url: report.sourceUrl,
    report_date: report.date,
  });
  if (reportError) throw reportError;

  const full = await getRestaurantBySlug(finalAreaSlug, finalSlug);
  if (!full) {
    throw new Error(
      "Restaurant vanished immediately after insert — this should not happen."
    );
  }
  return full;
}

export { latestReport };
