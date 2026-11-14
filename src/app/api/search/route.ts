import { NextRequest, NextResponse } from "next/server";
import { searchRestaurants } from "@/lib/data";

// Server-side search so the browser never has to download the full
// restaurant list. With 140,921 restaurants, shipping the whole dataset to
// every visitor (as the old client-side-filtered version did when there
// were only 520) isn't viable — this endpoint runs the query in Postgres
// (via searchRestaurants, which blends exact substring matches with
// pg_trgm typo-tolerant similarity matches via the search_restaurants_ranked
// RPC — see HANDOFF.md) and returns only the matching rows, already ranked.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";

  if (query.length > 100) {
    return NextResponse.json({ error: "Search term too long." }, { status: 400 });
  }

  try {
    const restaurants = await searchRestaurants(query, status);
    // Netlify runs this function in Ohio, far from the London database, so
    // keep each result at Netlify's edge for 10 minutes (and serve a stale
    // copy for up to a day while it refreshes). The cache key includes the
    // q and status parameters, so every search gets its own entry.
    return NextResponse.json(
      { restaurants },
      {
        headers: {
          "Cache-Control": "public, max-age=0, must-revalidate",
          "Netlify-CDN-Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400, durable",
          "Netlify-Vary": "query=q|status",
        },
      }
    );
  } catch (err) {
    console.error("Search failed:", err);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
