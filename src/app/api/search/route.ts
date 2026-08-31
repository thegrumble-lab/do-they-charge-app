import { NextRequest, NextResponse } from "next/server";
import { searchRestaurants } from "@/lib/data";

// Server-side search so the browser never has to download the full
// restaurant list. With 140,921 restaurants, shipping the whole dataset to
// every visitor (as the old client-side-filtered version did when there
// were only 520) isn't viable — this endpoint runs the query in Postgres
// (via searchRestaurants, which uses the pg_trgm index) and returns only
// the matching rows.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";

  if (query.length > 100) {
    return NextResponse.json({ error: "Search term too long." }, { status: 400 });
  }

  try {
    const restaurants = await searchRestaurants(query, status);
    return NextResponse.json({ restaurants });
  } catch (err) {
    console.error("Search failed:", err);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
