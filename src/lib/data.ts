import restaurantsSeed from "@/data/restaurants.json";
import { Restaurant, Report, latestReport } from "./types";

/**
 * DATA LAYER — currently backed by a static JSON sample (520 restaurants
 * across 8 major areas, pulled from the FSA Food Hygiene Rating Scheme
 * dataset). This is a dev/demo fixture, NOT the full 140,921-restaurant
 * national dataset (that lives in restaurants_seed.json on Matt's machine,
 * ready to import once a real database exists).
 *
 * Every function below is written so swapping this for real database
 * queries (e.g. Supabase/Postgres) later means rewriting the INSIDE of
 * these functions only — nothing that calls them needs to change.
 */

// In-memory mutable copy so the "add a report" flow has something to write
// to during local dev. This resets whenever the server restarts — it is
// NOT persistent storage. A real deployment needs this replaced with
// actual database reads/writes (see src/app/api/reports/route.ts).
const restaurants: Restaurant[] = JSON.parse(
  JSON.stringify(restaurantsSeed)
) as Restaurant[];

const bySlug = new Map<string, Restaurant>();
for (const r of restaurants) {
  bySlug.set(`${r.areaSlug}/${r.slug}`, r);
}

export function getAllRestaurants(): Restaurant[] {
  return restaurants;
}

export function getRestaurantBySlug(
  areaSlug: string,
  slug: string
): Restaurant | undefined {
  return bySlug.get(`${areaSlug}/${slug}`);
}

export function searchRestaurants(query: string, status: string): Restaurant[] {
  const q = query.trim().toLowerCase();
  return restaurants.filter((r) => {
    const latest = latestReport(r);
    const statusOk = status === "all" || latest?.status === status;
    const qOk =
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.area.toLowerCase().includes(q) ||
      r.postcode.toLowerCase().includes(q);
    return statusOk && qOk;
  });
}

export interface AreaSummary {
  areaSlug: string;
  area: string;
  count: number;
}

export function getAreas(): AreaSummary[] {
  const map = new Map<string, AreaSummary>();
  for (const r of restaurants) {
    const existing = map.get(r.areaSlug);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(r.areaSlug, { areaSlug: r.areaSlug, area: r.area, count: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

/**
 * DEV-ONLY write path. Appends a report to the in-memory copy of a
 * restaurant, or creates a new restaurant record if the slug doesn't
 * exist yet (mirrors the artifact's "match or create" behaviour).
 * A production deployment replaces the body of this function with a
 * real database insert (see the handoff notes for the schema).
 */
export function addReportDev(
  areaSlug: string,
  slug: string,
  name: string,
  area: string,
  report: Report
): Restaurant {
  const key = `${areaSlug}/${slug}`;
  let r = bySlug.get(key);
  if (!r) {
    r = {
      areaSlug,
      slug,
      name,
      area,
      address: "",
      postcode: "",
      lat: null,
      lng: null,
      fhrsid: "",
      reports: [],
    };
    restaurants.push(r);
    bySlug.set(key, r);
  }
  r.reports.push(report);
  return r;
}

export { latestReport };
