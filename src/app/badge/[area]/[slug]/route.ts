import { getRestaurantBySlug } from "@/lib/data";
import { latestReport } from "@/lib/types";

export const revalidate = 3600;

/**
 * "No service charge" badge that restaurants can embed on their own site,
 * linking back to their listing. Served only while the listing's latest
 * report says no service charge is added, so it can never vouch for a
 * restaurant that has started charging.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ area: string; slug: string }> }) {
  const { area, slug } = await params;
  const r = await getRestaurantBySlug(area, slug).catch(() => undefined);
  const latest = r ? latestReport(r) : undefined;
  if (!r || !r.isActive || latest?.status !== "no-charge") {
    return new Response("Not found", { status: 404 });
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="56" viewBox="0 0 200 56" role="img" aria-label="No service charge: listed on Discretionary">
  <rect x="1" y="1" width="198" height="54" rx="8" fill="#fffdf7" stroke="#1f2a24" stroke-width="2"/>
  <circle cx="26" cy="28" r="12" fill="#2f6b4f"/>
  <path d="M20 28.5l4 4 8-9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="46" y="25" font-family="Georgia, 'Times New Roman', serif" font-size="15" font-weight="700" fill="#1f2a24">No service charge</text>
  <text x="46" y="42" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="#4a5a50">Listed on discretionary.uk</text>
</svg>`;
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "X-Robots-Tag": "noindex",
    },
  });
}
