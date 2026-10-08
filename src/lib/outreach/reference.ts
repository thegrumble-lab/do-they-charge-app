import "server-only";
import { CHAIN_POLICIES } from "@/lib/chain-policies";
import { getAreas } from "@/lib/data";
import { SITE_URL } from "@/lib/site";
import { GUIDES } from "@/content/guides";
import { supabase } from "@/lib/supabase";

const PUB = 7843;
const RESTAURANT = 1;

/** Live split of listings with a stated policy into pubs/bars and restaurants/cafes (FSA business type). */
async function typeSplit(): Promise<string[]> {
  const latest = new Map<string, { status: string; pct: number | null; type: number | null }>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("reports")
      .select("restaurant_id, status, pct, report_date, created_at, restaurants!inner(business_type_id, is_active)")
      .order("restaurant_id")
      .order("report_date")
      .order("created_at")
      .range(from, from + 999);
    if (error) throw error;
    for (const r of (data ?? []) as unknown as { restaurant_id: string; status: string; pct: number | null; restaurants: { business_type_id: number | null; is_active: boolean } }[]) {
      if (r.restaurants?.is_active === false) continue;
      latest.set(r.restaurant_id, { status: r.status, pct: r.pct, type: r.restaurants?.business_type_id ?? null });
    }
    if (!data || data.length < 1000) break;
  }
  const rows = [...latest.values()].filter((r) => r.status === "charges" || r.status === "groups" || r.status === "no-charge");
  if (!rows.some((r) => r.type != null)) return [];
  const line = (label: string, type: number) => {
    const g = rows.filter((r) => r.type === type);
    const c = (s: string) => g.filter((r) => r.status === s).length;
    const add = c("charges") + c("groups");
    return `- ${label}: ${g.length} with a stated policy. ${add} add a service charge (${c("charges")} to every bill, ${c("groups")} for larger groups only); ${c("no-charge")} leave tipping to the diner.`;
  };
  return [
    `Split by FSA business type (live, today; FSA's own classification, pub/bar/nightclub vs restaurant/cafe/canteen):`,
    line("Pubs and bars", PUB),
    line("Restaurants and cafes", RESTAURANT),
    "- When asked about pubs, use these pub figures exactly. Never derive other percentages.",
  ];
}

/**
 * Reference material the journalist-reply AI can quote from, so it can answer
 * "what does chain X do?", "is there a breakdown for Manchester?" or "where's
 * the list with sources?" itself instead of passing it to Matt.
 */
let cached: string | null = null;

export async function pressReference(): Promise<string> {
  if (cached) return cached;
  const chains = CHAIN_POLICIES.map((c) => {
    try {
      const r = c.resolve({ name: c.chainName, area: "", address: "" });
      const varies = c.resolve.length > 0 ? " The rate varies by branch, so give the general policy and point to the source." : "";
      const status = r.status === "charges" ? "adds a service charge" : r.status === "no-charge" ? "does not add a service charge" : r.status === "groups" ? "adds a service charge for larger groups" : "policy unclear";
      return `- ${c.chainName}: ${status}. ${r.note}${varies} Source: ${r.sourceUrl}`;
    } catch {
      return null;
    }
  }).filter(Boolean);

  let areas: string[] = [];
  try {
    areas = (await getAreas()).slice(0, 80).map((a) => `- ${a.area}: ${SITE_URL}/browse/${a.areaSlug}`);
  } catch (err) {
    console.error("Couldn't load areas for press replies", err);
  }

  let split: string[] = [];
  try {
    split = await typeSplit();
  } catch (err) {
    console.error("Couldn't load the pub/restaurant split for press replies", err);
  }

  cached = [
    "REFERENCE MATERIAL (you may state and link anything here):",
    `- Home page and search across every listed restaurant, each with its source: ${SITE_URL}`,
    "",
    ...(split.length ? [...split, ""] : []),
    "Chain policies (from each chain's own published policy):",
    ...chains,
    "",
    areas.length ? "Area pages (every listed restaurant in that area, with sources):" : "",
    ...areas,
    "",
    "Guides:",
    ...GUIDES.map((g) => `- ${g.title}: ${SITE_URL}/guides/${g.slug}`),
  ].join("\n");
  return cached;
}
