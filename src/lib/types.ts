export type ReportStatus = "charges" | "no-charge" | "groups" | "unclear";

export interface Report {
  id: string;
  status: ReportStatus;
  pct: number | null;
  note: string;
  source: "seed" | "diner" | "researched";
  sourceUrl: string | null;
  date: string; // ISO date
}

export interface Restaurant {
  id: string;
  areaSlug: string;
  slug: string;
  name: string;
  area: string;
  address: string;
  postcode: string;
  lat: string | null;
  lng: string | null;
  fhrsid: string;
  isActive: boolean;
  /**
   * Food hygiene rating, straight from the FSA feed. Kept as the raw
   * string because the scheme is not numeric everywhere: England, Wales
   * and Northern Ireland use FHRS ("0"-"5"), Scotland uses FHIS ("Pass",
   * "Improvement Required"), and either can say "AwaitingInspection" or
   * "Exempt". Parse it with hygieneRating() rather than coercing it.
   */
  hygieneRating: string | null;
  hygieneRatingDate: string | null;
  hygieneScheme: string | null;
  reports: Report[];
}

/**
 * The hygiene rating in a form a page can render, or null when there is
 * nothing meaningful to show (no rating, awaiting inspection, exempt).
 *
 * This is FSA inspection data under the Open Government Licence, which is
 * why it can be stored and republished at all — unlike every customer
 * review source, none of which permit it. Attribution is a condition of
 * that licence, so whatever renders this names the FSA.
 */
export function hygieneRating(r: Restaurant): {
  label: string;
  /** 0-5 under FHRS; null under the Scottish scheme, which isn't a scale. */
  score: number | null;
  date: string | null;
} | null {
  const raw = (r.hygieneRating ?? "").trim();
  if (!raw) return null;

  const numeric = /^[0-5]$/.test(raw) ? Number(raw) : null;
  if (numeric !== null) {
    return { label: `${numeric} out of 5`, score: numeric, date: r.hygieneRatingDate };
  }

  // FHIS (Scotland) publishes a verdict, not a score.
  const verdicts: Record<string, string> = {
    pass: "Pass",
    "pass and eat safe": "Pass and Eat Safe",
    "improvement required": "Improvement required",
  };
  const verdict = verdicts[raw.toLowerCase()];
  if (verdict) {
    return { label: verdict, score: null, date: r.hygieneRatingDate };
  }

  // AwaitingInspection, AwaitingPublication, Exempt and anything else the
  // feed invents later: nothing useful to show, so show nothing.
  return null;
}

export const STATUS_META: Record<
  ReportStatus,
  { label: string; className: string }
> = {
  charges: { label: "Adds charge", className: "charges" },
  "no-charge": { label: "No charge", className: "no-charge" },
  groups: { label: "Groups only", className: "groups" },
  unclear: { label: "Unclear", className: "unclear" },
};

export function latestReport(r: Restaurant): Report | null {
  if (r.reports.length === 0) return null;
  return r.reports[r.reports.length - 1];
}

/**
 * Freshness. Restaurants change policy, menus and owners, so a report is
 * shown with its age and flagged once it passes STALE_AFTER_DAYS. The
 * verdict still shows; only the confidence drops. Pages are ISR-cached for
 * up to 6 hours, so ages are approximate by design ("3 months ago").
 */
export const STALE_AFTER_DAYS = 365;

export function reportAgeDays(date: string, now: Date = new Date()): number {
  const then = new Date(`${date.slice(0, 10)}T00:00:00Z`).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((now.getTime() - then) / 86_400_000));
}

export function relativeAge(date: string, now: Date = new Date()): string {
  const days = reportAgeDays(date, now);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30.44)} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? "over a year ago" : `over ${years} years ago`;
}

/** Seed rows are already labelled "unverified", so they never get the stale flag. */
export function isStale(report: Report, now: Date = new Date()): boolean {
  return report.source !== "seed" && reportAgeDays(report.date, now) > STALE_AFTER_DAYS;
}
