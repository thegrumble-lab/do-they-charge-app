/**
 * Runs one of the app/api/cron/* route handlers directly in Node, so the
 * scheduled jobs don't depend on the host's function time limits.
 * Used by .github/workflows/crons.yml:
 *
 *   npx tsx --require ./scripts/cron-preload.cjs scripts/run-cron.mts outreach
 *
 * Needs the same environment variables as the site (and CRON_SECRET).
 * Exits non-zero when the route returns an error status, so the run shows as failed.
 */
import { NextRequest } from "next/server";

const name = process.argv[2];
if (!name || !/^[a-z-]+$/.test(name)) {
  console.error("Usage: run-cron.mts <route-name>");
  process.exit(2);
}
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET is not set");
  process.exit(2);
}

const { existsSync } = await import("node:fs");
const rel = [`../app/api/cron/${name}/route.ts`, `../src/app/api/cron/${name}/route.ts`].find((p) => existsSync(new URL(p, import.meta.url)));
if (!rel) {
  console.error(`No cron route called ${name}`);
  process.exit(2);
}
const mod = await import(rel);
const req = new NextRequest(`https://cron.local/api/cron/${name}`, { headers: { authorization: `Bearer ${secret}` } });
const res: Response = await mod.GET(req);
const body = await res.text();
console.log(`${name}: ${res.status}`);
console.log(body);
if (!res.ok) process.exit(1);
process.exit(0);
