import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, checkPassword, sessionToken } from "@/lib/admin";

// Fixed delay on every attempt, successful or not. It costs a human one
// barely-noticeable pause per login and makes online brute-forcing of the
// admin password impractical. See src/lib/admin.ts for the wider
// trade-offs of the single-password approach.
const LOGIN_DELAY_MS = 400;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = body && typeof body.password === "string" ? body.password : "";

  await new Promise((resolve) => setTimeout(resolve, LOGIN_DELAY_MS));

  const token = sessionToken();
  if (!token) {
    return NextResponse.json(
      { error: "Admin access isn't configured on this deployment." },
      { status: 503 }
    );
  }

  if (!checkPassword(password)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14, // a fortnight
  });
  return res;
}

/** Sign out. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
