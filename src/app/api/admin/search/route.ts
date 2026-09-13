import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { adminFindRestaurants, getRestaurantBySlug } from "@/lib/data";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;

  // Exact lookup, used when opening the entry a flag points at — going
  // via the name would be useless for a flag on, say, a Wagamama.
  const areaSlug = params.get("areaSlug");
  const slug = params.get("slug");
  if (areaSlug && slug) {
    try {
      const one = await getRestaurantBySlug(areaSlug, slug);
      return NextResponse.json({ restaurants: one ? [one] : [] });
    } catch (err) {
      console.error("Admin lookup failed:", err);
      return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
    }
  }

  const q = params.get("q") ?? "";
  if (q.trim().length === 0) {
    return NextResponse.json({ restaurants: [] });
  }
  if (q.length > 100) {
    return NextResponse.json({ error: "Search term too long." }, { status: 400 });
  }

  try {
    const restaurants = await adminFindRestaurants(q);
    return NextResponse.json({ restaurants });
  } catch (err) {
    console.error("Admin search failed:", err);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
