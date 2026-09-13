import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Admin authentication — deliberately minimal.
 *
 * This site has no user accounts and doesn't want any: there is exactly
 * one operator, and the only thing behind the gate is restaurant data
 * (no personal data, no payments). So rather than Supabase Auth and a
 * users table, /admin is protected by a single shared password held in
 * the ADMIN_PASSWORD environment variable.
 *
 * The cookie never contains the password. It holds an HMAC derived from
 * it, so it can't be forged without knowing the password, and changing
 * ADMIN_PASSWORD immediately invalidates every existing session. Both
 * comparisons are timing-safe.
 *
 * Known limits, so nobody mistakes this for more than it is: a single
 * shared secret can't be revoked per-device, there's no audit trail of
 * who changed what, and the only brute-force defence is the fixed delay
 * in the login route plus the length of the password itself. That's an
 * acceptable trade at one operator and this blast radius; if the site
 * ever gains contributors, replace this with real auth rather than
 * handing the password around.
 */

export const ADMIN_COOKIE = "dc_admin";

// Bound into the HMAC so the cookie value can't be repurposed as
// anything else derived from the same secret.
const TOKEN_PAYLOAD = "discretionary-admin-v1";

function adminPassword(): string | null {
  const p = process.env.ADMIN_PASSWORD;
  return p && p.length > 0 ? p : null;
}

/** Constant-time string compare. Returns false on length mismatch. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** The value stored in the session cookie, or null if unconfigured. */
export function sessionToken(): string | null {
  const p = adminPassword();
  if (!p) return null;
  return createHmac("sha256", p).update(TOKEN_PAYLOAD).digest("hex");
}

export function checkPassword(input: string): boolean {
  const p = adminPassword();
  if (!p) return false;
  return safeEqual(input, p);
}

/** True when the caller holds a valid admin session cookie. */
export async function isAdmin(): Promise<boolean> {
  const token = sessionToken();
  if (!token) return false;
  const store = await cookies();
  const cookie = store.get(ADMIN_COOKIE);
  if (!cookie) return false;
  return safeEqual(cookie.value, token);
}

/** True when ADMIN_PASSWORD is set at all — used to explain a locked-out admin. */
export function adminConfigured(): boolean {
  return adminPassword() !== null;
}
