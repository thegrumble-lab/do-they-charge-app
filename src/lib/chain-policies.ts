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
  // matches if it contains ANY of these keywords. Ignored when `matches`
  // is provided.
  keywords?: string[];
  // Optional override for the default keyword substring check. Use this
  // when a chain's real-world FHRS listings are ambiguous under simple
  // keyword matching — e.g. TGI Fridays bundles in-house delivery
  // sub-brands ("Conviction Chicken", "Byron Burger", "Mother Clucker",
  // "Liberty Desserts") into the same listing under wildly inconsistent
  // punctuation (commas, ampersands, slashes, or no punctuation at all),
  // most of which isComboListing() below doesn't catch.
  matches?: (row: ChainPolicyRow) => boolean;
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
const TGI_FRIDAYS_SOURCE =
  "https://www.tgifridays.co.uk/sites/default/files/2026-05/TGI_web26_menu.pdf";

// FHRS listings for this chain use several different name spellings, and
// separately often bundle in-house delivery sub-brands into the same
// listing under inconsistent punctuation. Matches only the "clean"
// TGI Fridays name — i.e. after stripping one of these spellings out,
// nothing else is left besides punctuation/whitespace. A leftover brand
// name (e.g. ", Conviction Chicken") means we can't be sure the dine-in
// service charge applies at that table, so it's skipped rather than
// guessed at. Also correctly excludes unrelated FHRS entries that merely
// contain "tgi" (e.g. "TGI Catering", a stadium caterer).
const TGI_FRIDAYS_NAME_VARIANTS = ["tgi fridays", "tgi friday's", "tgifridays"];
function isTgiFridaysCleanListing(row: ChainPolicyRow): boolean {
  const lower = row.name.toLowerCase();
  const variant = TGI_FRIDAYS_NAME_VARIANTS.find((v) => lower.includes(v));
  if (!variant) return false;
  const remainder = lower.replace(variant, "").replace(/[\s,&()/.'-]/g, "");
  return remainder.length === 0;
}

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
  {
    chainName: "TGI Fridays",
    matches: isTgiFridaysCleanListing,
    resolve: () => ({
      status: "groups",
      pct: 10,
      note: "TGI Fridays' own menu (published on their website) states a discretionary 10% service charge is added for groups of 7 or more, with 100% of it going directly to the team in that restaurant.",
      sourceUrl: TGI_FRIDAYS_SOURCE,
    }),
  },
];

export function matchChainPolicy(row: ChainPolicyRow): ChainPolicy | null {
  if (isComboListing(row.name)) return null;
  const lowerName = row.name.toLowerCase();
  for (const policy of CHAIN_POLICIES) {
    const isMatch = policy.matches
      ? policy.matches(row)
      : (policy.keywords ?? []).some((kw) => lowerName.includes(kw));
    if (isMatch) return policy;
  }
  return null;
}
