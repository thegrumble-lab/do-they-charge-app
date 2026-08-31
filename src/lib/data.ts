import { supabase } from "./supabase";
import { Restaurant, Report, ReportStatus, latestReport } from "./types";

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
  source: "seed" | "diner";
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
  reports?: DbReport[];
}

const RESTAURANT_COLUMNS =
  "id, fhrsid, area_slug, slug, name, area, address, postcode, lat, lng";
const RESTAURANT_WITH_REPORTS_SELECT = `${RESTAURANT_COLUMNS}, reports(id, status, pct, note, source, report_date, created_at)`;

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
  let builder = supabase
    .from("restaurants")
    .select(RESTAURANT_WITH_REPORTS_SELECT);

  const q = query.trim();
  if (q) {
    const escaped = q.replace(/[%,]/g, "");
    builder = builder.or(
      `name.ilike.%${escaped}%,area.ilike.%${escaped}%,postcode.ilike.%${escaped}%`
    );
  }

  const { data, error } = await builder.order("name").limit(200);
  if (error) throw error;

  let restaurants = (data ?? []).map(toRestaurant);
  if (status !== "all") {
    restaurants = restaurants.filter(
      (r) => latestReport(r)?.status === status
    );
  }
  return restaurants;
}

export async function getRestaurantCount(): Promise<number> {
  const { count, error } = await supabase
    .from("restaurants")
    .select("*", { count: "exact", head: true });
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

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-+|-+$)/g, "") || "x"
  );
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
