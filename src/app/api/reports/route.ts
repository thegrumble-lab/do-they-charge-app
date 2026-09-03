import { NextRequest, NextResponse } from "next/server";
import {
  submitDinerReport,
  RestaurantNotFoundError,
  RateLimitedError,
} from "@/lib/data";
import { ReportStatus } from "@/lib/types";

const VALID_STATUSES: ReportStatus[] = [
  "charges",
  "no-charge",
  "groups",
  "unclear",
];

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

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  // Honeypot: a real visitor never sees or fills this field.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    // Pretend success so the bot doesn't learn anything; just don't save it.
    return NextResponse.json({ ok: true });
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";

  const { areaSlug, slug, name, area, status, pct, note } = body as {
    areaSlug?: string;
    slug?: string;
    name?: string;
    area?: string;
    status?: string;
    pct?: number | null;
    note?: string;
  };

  if (!name || !area || !status || !VALID_STATUSES.includes(status as ReportStatus)) {
    return NextResponse.json(
      { error: "Restaurant name, area, and what happened are all required." },
      { status: 400 }
    );
  }
  if (name.length > 80 || area.length > 60 || (note && note.length > 220)) {
    return NextResponse.json({ error: "That's too long." }, { status: 400 });
  }

  const finalAreaSlug = areaSlug || slugify(area);
  const finalSlug = slug || slugify(name);

  let restaurant;
  try {
    restaurant = await submitDinerReport(
      finalAreaSlug,
      finalSlug,
      status as ReportStatus,
      typeof pct === "number" ? pct : null,
      (note || "").slice(0, 220),
      ip
    );
  } catch (err) {
    if (err instanceof RestaurantNotFoundError) {
      return NextResponse.json(
        { error: "Couldn't find that restaurant — try refreshing the page." },
        { status: 404 }
      );
    }
    if (err instanceof RateLimitedError) {
      return NextResponse.json(
        { error: "Slow down a moment before adding another report." },
        { status: 429 }
      );
    }
    console.error("Failed to save report:", err);
    return NextResponse.json(
      { error: "Could not save that just now." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, restaurant });
}
