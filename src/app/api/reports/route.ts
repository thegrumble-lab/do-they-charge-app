import { NextRequest, NextResponse } from "next/server";
import { addReport } from "@/lib/data";
import { ReportStatus } from "@/lib/types";

const VALID_STATUSES: ReportStatus[] = [
  "charges",
  "no-charge",
  "groups",
  "unclear",
];

// Best-effort in-memory rate limit — fine for a single dev server, but
// resets on every deploy/cold start and won't be shared across serverless
// instances. Replace with a real store (e.g. Upstash Redis, or a
// `submissions` table with a timestamp check) once this goes live.
const recentSubmissions = new Map<string, number>();
const RATE_LIMIT_MS = 30_000;

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
  const last = recentSubmissions.get(ip);
  if (last && Date.now() - last < RATE_LIMIT_MS) {
    return NextResponse.json(
      { error: "Slow down a moment before adding another report." },
      { status: 429 }
    );
  }

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

  const report = {
    status: status as ReportStatus,
    pct: typeof pct === "number" ? pct : null,
    note: (note || "").slice(0, 220),
    source: "diner" as const,
    date: new Date().toISOString().slice(0, 10),
  };

  let restaurant;
  try {
    restaurant = await addReport(finalAreaSlug, finalSlug, name, area, report);
  } catch (err) {
    console.error("Failed to save report:", err);
    return NextResponse.json(
      { error: "Could not save that just now." },
      { status: 500 }
    );
  }

  recentSubmissions.set(ip, Date.now());

  return NextResponse.json({ ok: true, restaurant });
}
