import { NextResponse, type NextRequest } from "next/server";
import { unsubscribe } from "@/lib/outreach/unsubscribe";

export const dynamic = "force-dynamic";

/** RFC 8058 one-click unsubscribe (used by Gmail and others). */
export async function POST(request: NextRequest) {
  const e = request.nextUrl.searchParams.get("e") ?? "";
  const t = request.nextUrl.searchParams.get("t") ?? "";
  const ok = await unsubscribe(e, t).catch(() => false);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}

export async function GET(request: NextRequest) {
  const url = new URL("/unsubscribe", request.nextUrl.origin);
  url.search = request.nextUrl.search;
  return NextResponse.redirect(url);
}
