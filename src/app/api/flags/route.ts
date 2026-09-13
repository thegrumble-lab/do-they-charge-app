import { NextRequest, NextResponse } from "next/server";
import {
  submitReportFlag,
  RestaurantNotFoundError,
  RateLimitedError,
  InvalidFlagError,
} from "@/lib/data";
import { ReportStatus } from "@/lib/types";

// Public "this entry looks wrong" submissions. Same shape as
// /api/reports: honeypot field, per-IP cooldown enforced in Postgres,
// generic errors out. Flags are never shown publicly — they queue up in
// /admin.
const VALID_STATUSES: ReportStatus[] = [
  "charges",
  "no-charge",
  "groups",
  "unclear",
];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  // Honeypot: a real visitor never sees or fills this field.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const { areaSlug, slug, message, suggestedStatus, suggestedPct } = body as {
    areaSlug?: string;
    slug?: string;
    message?: string;
    suggestedStatus?: string | null;
    suggestedPct?: number | null;
  };

  if (!areaSlug || !slug) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!message || message.trim().length === 0) {
    return NextResponse.json(
      { error: "Tell us what's wrong and we'll take a look." },
      { status: 400 }
    );
  }
  if (message.length > 500) {
    return NextResponse.json({ error: "That's too long." }, { status: 400 });
  }
  if (
    suggestedStatus != null &&
    !VALID_STATUSES.includes(suggestedStatus as ReportStatus)
  ) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (
    suggestedPct != null &&
    (typeof suggestedPct !== "number" ||
      Number.isNaN(suggestedPct) ||
      suggestedPct < 0 ||
      suggestedPct > 100)
  ) {
    return NextResponse.json(
      { error: "Percentage must be between 0 and 100." },
      { status: 400 }
    );
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";

  try {
    await submitReportFlag(
      areaSlug,
      slug,
      message.trim(),
      (suggestedStatus as ReportStatus) ?? null,
      typeof suggestedPct === "number" ? suggestedPct : null,
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
        { error: "Slow down a moment before sending another." },
        { status: 429 }
      );
    }
    if (err instanceof InvalidFlagError) {
      return NextResponse.json({ error: "Bad request." }, { status: 400 });
    }
    console.error("Failed to save flag:", err);
    return NextResponse.json(
      { error: "Could not send that just now." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
