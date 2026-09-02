// Curated, citable service-charge policies for UK-wide chains — applied
// automatically by scripts/sync-fhrs.ts to every active, zero-report
// restaurant that matches. See HANDOFF.md ("Chain-policy backfill") for how
// this list was researched and why it's short: most chains simply don't
// publish an "we add X%" statement on their own site (they publish
// tronc/distribution pages instead, which don't confirm whether a charge is
// applied) — every entry here cleared that bar; many candidates checked did
// not and were left out rather than guessed at.
//
// A chain policy never overwrites a diner-submitted report — sync-fhrs.ts
// only applies these to restaurants with zero existing reports of any
// source, same rule as everywhere else in this project.
//
// Add new chains here once a real citable source is found — no other code
// changes needed; this file alone controls both the one-off backfill (every
// future sync run re-checks every active restaurant) and ongoing coverage
// of newly-added branches.

import { ReportStatus } from "./types";

export interface ChainPolicyRow {
  name: string;
  area: string;
  address: string;
}

export interface ChainReport {
  status: ReportStatus;
  pct: number | null;
  note: string;
  sourceUrl: string;
}

export interface ChainPolicy {
  chainName: string;
  // Case-insensitive substring match against the restaurant's name. A row
  // matches if it contains ANY of these keywords.
  keywords: string[];
  // Multi-brand/food-court listings (e.g. "Zizzi also trading as Coco di
  // Mama", "Chiquito / Bao Now / Bone Jam") are skipped — we can't be sure
  // which brand's policy actually applies at that specific table, so we
  // don't guess. This mirrors is_combo() used during the manual backfill.
  resolve: (row: ChainPolicyRow) => ChainReport;
}

function isComboListing(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes("/") ||
    lower.includes(" t/a ") ||
    lower.includes("also t/a") ||
    lower.includes("trading as") ||
    lower.includes("also trading") ||
    lower.includes("case notes")
  );
}

const FRANCO_MANCA_SOURCE = "https://www.francomanca.co.uk/faqs/";
const PREZZO_SOURCE = "https://www.prezzo.co.uk/faq/";
const TURTLE_BAY_SOURCE =
  "https://turtlebay.co.uk/discover/equality-inclusion/fair-share-policy";

// Turtle Bay's own Fair Share Policy page names five branches with an
// automatic charge; every other branch only charges for parties of 4+.
const TURTLE_BAY_NAMED_BRANCHES: Record<string, number> = {
  chelmsford: 12.5,
  camden: 10,
  ealing: 10,
  hammersmith: 10,
  brixton: 10,
};

export const CHAIN_POLICIES: ChainPolicy[] = [
  {
    chainName: "Franco Manca",
    keywords: ["franco manca"],
    resolve: () => ({
      status: "charges",
      pct: null,
      note: "Franco Manca's own FAQ states an optional service charge is added to the bill: 10% outside London, 12.5% inside London.",
      sourceUrl: FRANCO_MANCA_SOURCE,
    }),
  },
  {
    chainName: "Prezzo",
    keywords: ["prezzo"],
    resolve: () => ({
      status: "charges",
      pct: null,
      note: "Prezzo's own FAQ states 100% of customer gratuities go to the team via their TiPJAR-run tronc, funded by discretionary service charges left by customers; no fixed percentage is published.",
      sourceUrl: PREZZO_SOURCE,
    }),
  },
  {
    chainName: "Turtle Bay",
    keywords: ["turtle bay"],
    resolve: (row) => {
      const haystack = `${row.area} ${row.address}`.toLowerCase();
      for (const [branch, pct] of Object.entries(TURTLE_BAY_NAMED_BRANCHES)) {
        if (haystack.includes(branch)) {
          return {
            status: "charges",
            pct,
            note: `Turtle Bay's own Fair Share Policy page states this branch is one of the restaurants where a discretionary ${pct}% service charge is automatically added to all tables.`,
            sourceUrl: TURTLE_BAY_SOURCE,
          };
        }
      }
      return {
        status: "groups",
        pct: 10,
        note: "Turtle Bay's own Fair Share Policy page states this branch does not automatically add a service charge, except for parties of 4 or more, where a discretionary 10% is added.",
        sourceUrl: TURTLE_BAY_SOURCE,
      };
    },
  },
];

export function matchChainPolicy(row: ChainPolicyRow): ChainPolicy | null {
  if (isComboListing(row.name)) return null;
  const lowerName = row.name.toLowerCase();
  for (const policy of CHAIN_POLICIES) {
    if (policy.keywords.some((kw) => lowerName.includes(kw))) {
      return policy;
    }
  }
  return null;
}
