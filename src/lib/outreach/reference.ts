import "server-only";
import { CHAIN_POLICIES } from "@/lib/chain-policies";
import { getAreas } from "@/lib/data";
import { SITE_URL } from "@/lib/site";
import { GUIDES } from "@/content/guides";

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

  cached = [
    "REFERENCE MATERIAL (you may state and link anything here):",
    `- Home page and search across every listed restaurant, each with its source: ${SITE_URL}`,
    "",
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
