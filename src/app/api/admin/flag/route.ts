import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { adminResolveFlag } from "@/lib/data";

/** Dismiss a flag without editing anything — spam, or nothing to fix. */
export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const flagId = body && typeof body.flagId === "string" ? body.flagId : null;
  if (!flagId) {
    return NextResponse.json({ error: "Which flag?" }, { status: 400 });
  }

  try {
    await adminResolveFlag(flagId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Resolving flag failed:", err);
    return NextResponse.json(
      { error: "Could not update that just now." },
      { status: 500 }
    );
  }
}
