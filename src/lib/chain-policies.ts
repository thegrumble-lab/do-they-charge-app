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

const MILLER_AND_CARTER_SOURCE = "https://www.millerandcarter.co.uk/tablebooking#/";

// Every FHRS listing for this chain is a single-brand "Miller & Carter" (or
// "Miller And Carter", "Miller \& Carter", plus an optional branch-name
// suffix) — no multi-brand food-court bundling like TGI Fridays, so a
// simple "contains both words" check is enough; isComboListing() above
// still runs first as a backstop.
function isMillerAndCarter(row: ChainPolicyRow): boolean {
  const lower = row.name.toLowerCase();
  return lower.includes("miller") && lower.includes("carter");
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


// --- second research pass, 25 September 2026 ---------------------------
//
// Sources for everything below are the chain's own site, menu PDF, FAQ or
// booking terms. Tronc pages were rejected throughout: "100% of tips go to
// our teams" says nothing about whether a charge is added, and it is by far
// the most common false positive when researching this — Bella Italia,
// Cafe Rouge and Wagamama all publish that language and none of them state
// whether a charge is applied. They are deliberately absent.
//
// Also deliberately absent: the big pub companies. Their estates are large,
// but FHRS lists each pub under its own name ("The Grey Hound", "The Ship
// Tavern"), not the brand, so name matching cannot reach them at all. This
// applies to Vintage Inns (10% on tables of 8+), Nicholson's, Young's and
// Fuller's, all of which DO publish a policy — see HANDOFF.md, where the
// findings are recorded so the research isn't repeated. Reaching them needs
// a branch-address list, not a keyword.

/** Accent- and case-insensitive name, for matching "Côte" as "cote". */
function plainName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function wordMatch(name: string, ...words: string[]): boolean {
  const plain = plainName(name);
  return words.some((w) => new RegExp(`\\b${w}\\b`).test(plain));
}

const LAS_IGUANAS_SOURCE = "https://www.iguanas.co.uk/faqs";
const GBK_SOURCE = "https://gbk.co.uk/assets/gbk-main-menu.pdf";
const HONEST_BURGERS_SOURCE =
  "https://www.honestburgers.co.uk/wp-content/uploads/2026/05/May_T4.pdf";
const COTE_SOURCE = "https://www.cote.co.uk/cote-policies/service-charge-policy";
const DISHOOM_SOURCE = "https://www.dishoom.com/menu/all-day-main/";
const GIGGLING_SQUID_SOURCE =
  "https://www.gigglingsquid.com/frequently-asked-questions/";
const WILDWOOD_SOURCE =
  "https://wildwoodrestaurants.co.uk/wp-content/uploads/Wildwood-10-Spring-menu.pdf";
const ROSAS_THAI_SOURCE =
  "https://rosasthai.com/wp-content/uploads/2024/03/Dessert-menu_Spring-Summer_24_web.pdf";
const BANANA_TREE_SOURCE = "https://bananatree.co.uk/service-charge-policy";
const IVY_COLLECTION_SOURCE = "https://ivycollection.com/tipping-policy/";
const BROWNS_SOURCE =
  "https://www.browns-restaurants.co.uk/restaurants/northwest/manchester/lunch-early-evening";
const ALL_BAR_ONE_SOURCE =
  "https://www.allbarone.co.uk/content/dam/all-bar-one/pdf/2025/ln25/mainmenu-eng-pb4-o2.pdf";
const COSY_CLUB_SOURCE =
  "https://content.cosyclub.co.uk/wp-content/uploads/2025/07/BAND-A-DINNER-TAW25.pdf";
const PIZZA_EXPRESS_SOURCE =
  "https://www.pizzaexpress.com/terms-and-conditions/payattable";
const ZIZZI_SOURCE = "https://www.zizzi.co.uk/bookings/bookings-policy";
const ASK_ITALIAN_SOURCE = "https://www.askitalian.co.uk/bookings/booking-policy";

// Banana Tree publishes a per-site rate. Their London list gets 12.5%,
// the rest 10%; a site on neither list falls to the 10% wording, which is
// what the policy states for their non-London restaurants.
const BANANA_TREE_HIGHER_RATE_SITES = [
  "soho",
  "battersea",
  "islington",
  "maida vale",
  "west hampstead",
  "westbourne grove",
  "covent garden",
  "o2",
  "greenwich",
];

// "Browns" alone would match any number of unrelated cafes, so this
// requires the brand's full trading style. M&B list these as "Browns Bar
// & Brasserie" or similar.
function isBrownsBrasserie(row: ChainPolicyRow): boolean {
  const plain = plainName(row.name);
  return plain.includes("browns") && plain.includes("brasserie");
}

// The Ivy Collection venues are "The Ivy <place> Brasserie", "The Ivy
// Asia" and so on. Plenty of unrelated pubs are called The Ivy House or
// similar, so the name has to start with "the ivy" and not continue into
// one of those.
const NOT_THE_IVY_COLLECTION = /^the ivy (house|inn|leaf|cottage|bush|tavern|arms)/;
function isIvyCollection(row: ChainPolicyRow): boolean {
  const plain = plainName(row.name);
  return /^the ivy\b/.test(plain) && !NOT_THE_IVY_COLLECTION.test(plain);
}

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
  {
    chainName: "Miller & Carter",
    matches: isMillerAndCarter,
    resolve: () => ({
      status: "groups",
      pct: 10,
      note: "Miller & Carter's own online booking terms state a discretionary 10% service charge is added to the bill for tables of 8 or more.",
      sourceUrl: MILLER_AND_CARTER_SOURCE,
    }),
  },
  {
    chainName: "Las Iguanas",
    keywords: ["las iguanas"],
    resolve: () => ({
      status: "charges",
      pct: null,
      note: "Las Iguanas' own FAQ states service charge is added to your bill and is at your discretion, and that staff will remove it on request. No percentage is published.",
      sourceUrl: LAS_IGUANAS_SOURCE,
    }),
  },
  {
    chainName: "Honest Burgers",
    keywords: ["honest burgers"],
    resolve: () => ({
      status: "charges",
      pct: 10,
      note: "Honest Burgers' own menu states a discretionary 10% service charge is added to the bill.",
      sourceUrl: HONEST_BURGERS_SOURCE,
    }),
  },
  {
    chainName: "Dishoom",
    keywords: ["dishoom"],
    resolve: () => ({
      status: "charges",
      pct: 12.5,
      note: "Dishoom's own menu states an optional 12.5% service charge is added to the bill, that every penny goes to the team, and that the charge will be removed on request.",
      sourceUrl: DISHOOM_SOURCE,
    }),
  },
  {
    chainName: "Giggling Squid",
    keywords: ["giggling squid"],
    resolve: () => ({
      status: "charges",
      pct: 10,
      note: "Giggling Squid's own FAQ states they add a 10% tip automatically to the bill, payable at your discretion, and removed if you ask.",
      sourceUrl: GIGGLING_SQUID_SOURCE,
    }),
  },
  {
    chainName: "Wildwood",
    matches: (row) => /^wildwood\b/.test(plainName(row.name)),
    resolve: () => ({
      status: "charges",
      pct: 10,
      note: "Wildwood's own menu states an optional service charge of 10% is added to the bill.",
      sourceUrl: WILDWOOD_SOURCE,
    }),
  },
  {
    chainName: "Rosa's Thai",
    keywords: ["rosa's thai", "rosas thai"],
    resolve: () => ({
      status: "charges",
      pct: null,
      note: "A Rosa's Thai menu published on their own site states an optional service charge is added to the bill, and that you can ask for a different amount or none. No percentage is given, and the menu found dates from 2024.",
      sourceUrl: ROSAS_THAI_SOURCE,
    }),
  },
  {
    chainName: "Banana Tree",
    keywords: ["banana tree"],
    resolve: (row) => {
      const haystack = plainName(`${row.name} ${row.area} ${row.address}`);
      const higher = BANANA_TREE_HIGHER_RATE_SITES.some((site) =>
        haystack.includes(site)
      );
      const pct = higher ? 12.5 : 10;
      return {
        status: "charges",
        pct,
        note: `Banana Tree's own service charge policy lists an optional ${pct}% added to all tables at this group of restaurants — 12.5% at their London sites, 10% elsewhere — removed on request.`,
        sourceUrl: BANANA_TREE_SOURCE,
      };
    },
  },
  {
    chainName: "The Ivy Collection",
    matches: isIvyCollection,
    resolve: () => ({
      status: "charges",
      pct: null,
      note: "The Ivy Collection's own tipping policy states a discretionary service charge is added to all guest bills, with 100% passed to employees. No percentage is published, and the statement covers the collection as a whole rather than naming individual restaurants.",
      sourceUrl: IVY_COLLECTION_SOURCE,
    }),
  },
  {
    chainName: "Browns Bar & Brasserie",
    matches: isBrownsBrasserie,
    resolve: () => ({
      status: "charges",
      pct: 10,
      note: "Browns' own restaurant pages and menus state an optional 10% service charge is added to all tables, shared among the team in that restaurant.",
      sourceUrl: BROWNS_SOURCE,
    }),
  },
  {
    chainName: "All Bar One",
    keywords: ["all bar one"],
    resolve: () => ({
      status: "charges",
      pct: 10,
      note: "All Bar One's own menu states that where table service is offered, a discretionary service charge of 10% may be added — so it applies to table service rather than to drinks ordered at the bar.",
      sourceUrl: ALL_BAR_ONE_SOURCE,
    }),
  },
  {
    chainName: "Cosy Club",
    keywords: ["cosy club"],
    resolve: () => ({
      status: "charges",
      pct: 10,
      note: "Cosy Club's own menu states a discretionary 10% service charge is added to the bill, all of which goes to the team.",
      sourceUrl: COSY_CLUB_SOURCE,
    }),
  },
  {
    chainName: "Cote",
    matches: (row) => wordMatch(row.name, "cote"),
    resolve: () => ({
      status: "charges",
      pct: null,
      note: "Cote's own service charge policy says it is entirely your choice whether to pay the service charge and to ask if you wish it removed — which implies it is added to the bill. Their wording elsewhere on the same page describes it as a charge you leave, and no percentage is published.",
      sourceUrl: COTE_SOURCE,
    }),
  },
  {
    chainName: "Gourmet Burger Kitchen",
    matches: (row) =>
      plainName(row.name).includes("gourmet burger kitchen") ||
      wordMatch(row.name, "gbk"),
    resolve: () => ({
      status: "unclear",
      pct: null,
      note: "GBK's own menu states a discretionary service charge of 12.5% may be levied, and to check in restaurant for details — which stops short of confirming it is added to every bill.",
      sourceUrl: GBK_SOURCE,
    }),
  },
  {
    chainName: "Pizza Express",
    keywords: ["pizza express", "pizzaexpress"],
    resolve: () => ({
      status: "groups",
      pct: 12.5,
      note: "Pizza Express' own pay-at-table terms state a discretionary 12.5% service charge for tables over 7, and that including it is entirely up to you. Their booking terms separately state a discretionary 12.5% on all pizza-making parties, with no party-size threshold.",
      sourceUrl: PIZZA_EXPRESS_SOURCE,
    }),
  },
  {
    chainName: "Zizzi",
    keywords: ["zizzi"],
    resolve: () => ({
      status: "groups",
      pct: 10,
      note: "Zizzi's own bookings policy states a 10% tip is added automatically for groups of 6 or more, and for all bills at their Central London restaurants, and that it is optional and removed on request.",
      sourceUrl: ZIZZI_SOURCE,
    }),
  },
  {
    chainName: "ASK Italian",
    keywords: ["ask italian"],
    resolve: () => ({
      status: "groups",
      pct: 10,
      note: "ASK Italian's own booking policy states a 10% discretionary service charge for bookings of 6 or more (with a minimum of 6 main courses), and for any party size at their London sites.",
      sourceUrl: ASK_ITALIAN_SOURCE,
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
