import "server-only";
import { getPgPool } from "../db";
import { redis } from "./store";

/**
 * Visitor submissions summary for the weekday "Sites status" email.
 *
 * The status email is built by the Carer Tickets app, which shares this
 * Upstash Redis but has no access to Discretionary's Postgres. So each
 * weekday outreach run (08:20, before the 08:45 status email) saves a
 * small snapshot under SUMMARY_KEY and Carer Tickets reads it from there.
 *
 * "Submissions" are diner reports (reports.source = 'diner', added through
 * the form on a restaurant page) and error flags (report_flags). Researched
 * and seeded reports are left out.
 */

export const SUMMARY_KEY = "dc:submissions:summary";

export type SubmissionsSummary = {
  v: 1;
  at: string;
  reportsLast24h: number;
  reportsLast7Days: number;
  reportsTotal: number;
  flagsLast24h: number;
  flagsLast7Days: number;
  flagsOpen: number;
  recent: { kind: "report" | "flag"; restaurant: string; area: string; detail: string; at: string }[];
};

export async function buildSubmissionsSummary(): Promise<SubmissionsSummary> {
  const db = getPgPool();
  const [counts, recentReports, recentFlags] = await Promise.all([
    db.query<{
      r24: string; r7: string; rall: string; f24: string; f7: string; fopen: string;
    }>(
      `select
         (select count(*) from reports where source = 'diner' and created_at > now() - interval '24 hours') as r24,
         (select count(*) from reports where source = 'diner' and created_at > now() - interval '7 days') as r7,
         (select count(*) from reports where source = 'diner') as rall,
         (select count(*) from report_flags where created_at > now() - interval '24 hours') as f24,
         (select count(*) from report_flags where created_at > now() - interval '7 days') as f7,
         (select count(*) from report_flags where resolved_at is null) as fopen`
    ),
    db.query<{ name: string; area: string; status: string; pct: number | null; note: string | null; created_at: Date }>(
      `select r.name, r.area, rep.status, rep.pct, rep.note, rep.created_at
         from reports rep join restaurants r on r.id = rep.restaurant_id
        where rep.source = 'diner' and rep.created_at > now() - interval '7 days'
        order by rep.created_at desc limit 10`
    ),
    db.query<{ name: string; area: string; message: string; created_at: Date }>(
      `select r.name, r.area, f.message, f.created_at
         from report_flags f join restaurants r on r.id = f.restaurant_id
        where f.created_at > now() - interval '7 days'
        order by f.created_at desc limit 10`
    ),
  ]);
  const c = counts.rows[0];
  const clip = (s: string | null | undefined, n: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

  const recent: SubmissionsSummary["recent"] = [
    ...recentReports.rows.map((r) => ({
      kind: "report" as const,
      restaurant: clip(r.name, 80),
      area: clip(r.area, 40),
      detail: clip(`${r.status}${r.pct != null ? ` ${r.pct}%` : ""}${r.note ? `: ${r.note}` : ""}`, 160),
      at: new Date(r.created_at).toISOString(),
    })),
    ...recentFlags.rows.map((f) => ({
      kind: "flag" as const,
      restaurant: clip(f.name, 80),
      area: clip(f.area, 40),
      detail: clip(f.message, 160),
      at: new Date(f.created_at).toISOString(),
    })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 10);

  return {
    v: 1,
    at: new Date().toISOString(),
    reportsLast24h: Number(c.r24),
    reportsLast7Days: Number(c.r7),
    reportsTotal: Number(c.rall),
    flagsLast24h: Number(c.f24),
    flagsLast7Days: Number(c.f7),
    flagsOpen: Number(c.fopen),
    recent,
  };
}

/** Builds the snapshot and saves it for the Sites status email. */
export async function publishSubmissionsSummary(): Promise<SubmissionsSummary> {
  const summary = await buildSubmissionsSummary();
  await redis().set(SUMMARY_KEY, JSON.stringify(summary), { ex: 4 * 86400 });
  return summary;
}
