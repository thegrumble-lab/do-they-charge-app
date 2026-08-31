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
  reports: Report[];
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
