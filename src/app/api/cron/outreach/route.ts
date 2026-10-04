import { NextResponse, type NextRequest } from "next/server";
import { runOutreach } from "@/lib/outreach/run";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Called each weekday morning by Vercel Cron (see vercel.json). */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const report = await runOutreach();
  return NextResponse.json({
    imported: report.imported,
    sent: report.sent.length,
    replies: report.replies.length,
    errors: report.errors,
    notes: report.notes,
  });
}
