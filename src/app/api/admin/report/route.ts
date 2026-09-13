import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { adminUpdateReport, adminResolveFlag } from "@/lib/data";
import { ReportStatus } from "@/lib/types";

const VALID_STATUSES: ReportStatus[] = [
  "charges",
  "no-charge",
  "groups",
  "unclear",
];

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const { reportId, status, pct, note, date, resolveFlagId } = body as {
    reportId?: string;
    status?: string;
    pct?: number | null;
    note?: string;
    date?: string;
    resolveFlagId?: string;
  };

  if (!reportId || typeof reportId !== "string") {
    return NextResponse.json({ error: "Which report?" }, { status: 400 });
  }
  if (!status || !VALID_STATUSES.includes(status as ReportStatus)) {
    return NextResponse.json({ error: "Pick a valid status." }, { status: 400 });
  }
  if (pct !== null && pct !== undefined) {
    if (typeof pct !== "number" || Number.isNaN(pct) || pct < 0 || pct > 100) {
      return NextResponse.json(
        { error: "Percentage must be between 0 and 100." },
        { status: 400 }
      );
    }
  }
  if (note !== undefined && (typeof note !== "string" || note.length > 220)) {
    return NextResponse.json({ error: "That note's too long." }, { status: 400 });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Date must look like 2026-09-13." },
      { status: 400 }
    );
  }

  try {
    const { areaSlug, slug } = await adminUpdateReport(reportId, {
      status: status as ReportStatus,
      pct: typeof pct === "number" ? pct : null,
      note: note ?? "",
      date,
    });

    if (resolveFlagId && typeof resolveFlagId === "string") {
      await adminResolveFlag(resolveFlagId);
    }

    // Restaurant pages are cached for six hours (see the page's
    // `revalidate`), so without this a correction wouldn't show publicly
    // until that window expired — which rather defeats the point of
    // being able to fix a wrong figure quickly.
    revalidatePath(`/${areaSlug}/${slug}`);
    revalidatePath(`/browse/${areaSlug}`);

    return NextResponse.json({ ok: true, areaSlug, slug });
  } catch (err) {
    console.error("Admin report edit failed:", err);
    const message =
      err instanceof Error && err.message === "Report not found."
        ? "That report no longer exists."
        : "Could not save that just now.";
    const code = message.startsWith("That report") ? 404 : 500;
    return NextResponse.json({ error: message }, { status: code });
  }
}
