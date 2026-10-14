// The UK restaurant chain service charge tracker (/chains).
//
// One entry per chain checked, whether or not it publishes a policy. Two
// kinds of entry:
//
//  - Chains with a citable policy. Where the chain is also in
//    src/lib/chain-policies.ts (matcherName set), the note and source shown
//    on the tracker come from that file, so the tracker and the per-branch
//    reports can never disagree. The summary here is the short plain-English
//    line for the table.
//  - Chains checked with no published statement ("not-published"). This is
//    a finding in its own right, and wording matters: it means the chain's
//    own site, menus and terms say nothing either way, NOT that it doesn't
//    charge. Never describe one of these as "no service charge".
//
// Same bar as everything else on the site: the chain's own website, menu,
// FAQ or booking terms. Tronc pages ("100% of tips go to our teams") do not
// say whether a charge is added and never count as a policy.
//
// The monthly re-check task updates `checked` on every entry it re-verifies
// and appends to `changes` (newest first) when a chain's policy, rate or
// group threshold moves. Each change needs the date it was spotted and a
// one-line description in plain English.

export type ChainVerdict = "every-bill" | "groups" | "unclear" | "not-published";

export interface ChainChange {
  /** ISO date the change was spotted on the chain's own site. */
  date: string;
  /** e.g. "Rate rose from 10% to 12.5%". */
  text: string;
}

export interface TrackedChain {
  chain: string;
  slug: string;
  /** chainName in CHAIN_POLICIES, when branches are matched automatically. */
  matcherName?: string;
  verdict: ChainVerdict;
  /** Headline rate for the table, e.g. "10%", "10–12.5%"; null when unpublished. */
  rate: string | null;
  /** Smallest party the charge applies to, for "groups" entries. */
  groupSize: number | null;
  /** One plain-English line for the table. */
  summary: string;
  /** Longer note, for entries without a matcherName. */
  note?: string;
  /** Citable source, for entries without a matcherName. */
  sourceUrl?: string | null;
  /** ISO date first added to the tracker. */
  tracked: string;
  /** ISO date last verified against the chain's own site. */
  checked: string;
  changes: ChainChange[];
}

const FIRST_PASS = "2026-09-02";
const SECOND_PASS = "2026-09-25";

const notPublished = (
  chain: string,
  slug: string,
  note = "We checked this chain's own website, menus and booking terms and found no statement either way on whether a service charge is added to bills."
): TrackedChain => ({
  chain,
  slug,
  verdict: "not-published",
  rate: null,
  groupSize: null,
  summary: "No published policy found",
  note,
  sourceUrl: null,
  tracked: SECOND_PASS,
  checked: SECOND_PASS,
  changes: [],
});

const TRONC_ONLY =
  "This chain publishes a tipping or tronc page saying tips go to its teams, but nothing on its own site says whether a service charge is added to bills. A tronc statement isn't a service charge policy, so we don't count it as one.";

export const TRACKED_CHAINS: TrackedChain[] = [
  // --- chains with a citable policy ---------------------------------------
  {
    chain: "Franco Manca",
    slug: "franco-manca",
    matcherName: "Franco Manca",
    verdict: "every-bill",
    rate: "10–12.5%",
    groupSize: null,
    summary: "Optional charge on every bill: 12.5% in London, 10% elsewhere",
    tracked: FIRST_PASS,
    checked: FIRST_PASS,
    changes: [],
  },
  {
    chain: "Prezzo",
    slug: "prezzo",
    matcherName: "Prezzo",
    verdict: "every-bill",
    rate: null,
    groupSize: null,
    summary: "Discretionary service charge, rate not published",
    tracked: FIRST_PASS,
    checked: FIRST_PASS,
    changes: [],
  },
  {
    chain: "Turtle Bay",
    slug: "turtle-bay",
    matcherName: "Turtle Bay",
    verdict: "groups",
    rate: "10–12.5%",
    groupSize: 4,
    summary: "10% for parties of 4+, and on every bill at five named branches",
    tracked: FIRST_PASS,
    checked: FIRST_PASS,
    changes: [],
  },
  {
    chain: "TGI Fridays",
    slug: "tgi-fridays",
    matcherName: "TGI Fridays",
    verdict: "groups",
    rate: "10%",
    groupSize: 7,
    summary: "10% for groups of 7 or more",
    tracked: FIRST_PASS,
    checked: FIRST_PASS,
    changes: [],
  },
  {
    chain: "Miller & Carter",
    slug: "miller-and-carter",
    matcherName: "Miller & Carter",
    verdict: "groups",
    rate: "10%",
    groupSize: 8,
    summary: "10% for tables of 8 or more",
    tracked: FIRST_PASS,
    checked: FIRST_PASS,
    changes: [],
  },
  {
    chain: "Las Iguanas",
    slug: "las-iguanas",
    matcherName: "Las Iguanas",
    verdict: "every-bill",
    rate: null,
    groupSize: null,
    summary: "Added to the bill, removed on request; rate not published",
    tracked: SECOND_PASS,
    checked: SECOND_PASS,
    changes: [],
  },
  {
    chain: "Honest Burgers",
    slug: "honest-burgers",
    matcherName: "Honest Burgers",
    verdict: "every-bill",
    rate: "10%",
    groupSize: null,
    summary: "Discretionary 10% added to the bill",
    tracked: SECOND_PASS,
    checked: SECOND_PASS,
    changes: [],
  },
  {
    chain: "Dishoom",
    slug: "dishoom",
    matcherName: "Dishoom",
    verdict: "every-bill",
    rate: "12.5%",
    groupSize: null,
    summary: "Optional 12.5% added to the bill",
    tracked: SECOND_PASS,
    checked: SECOND_PASS,
    changes: [],
  },
  {
    chain: "Giggling Squid",
    slug: "giggling-squid",
    matcherName: "Giggling Squid",
    verdict: "every-bill",
    rate: "10%",
    groupSize: null,
    summary: "10% added automatically, removed if you ask",
    tracked: SECOND_PASS,
    checked: SECOND_PASS,
    changes: [],
  },
  {
    chain: "Wildwood",
    slug: "wildwood",
    matcherName: "Wildwood",
    verdict: "every-bill",
    rate: "10%",
    groupSize: null,
    summary: "Optional 10% added to the bill",
    tracked: SECOND_PASS,
    checked: SECOND_PASS,
    changes: [],
  },
  {
    chain: "Rosa's Thai",
    slug: "rosas-thai",
    matcherName: "Rosa's Thai",
    verdict: "every-bill",
    rate: null,
    groupSize: null,
    summary: "Optional charge added to the bill; rate not published",
    tracked: SECOND_PASS,
    checked: SECOND_PASS,
    changes: [],
  },
  {
    chain: "Banana Tree",
    slug: "banana-tree",
    matcherName: "Banana Tree",
    verdict: "every-bill",
    rate: "10–12.5%",
    groupSize: null,
    summary: "Optional charge on every table: 12.5% in London, 10% elsewhere",
    tracked: SECOND_PASS,
    checked: SECOND_PASS,
    changes: [],
  },
  {
    chain: "The Ivy Collection",
    slug: "the-ivy-collection",
    matcherName: "The Ivy Collection",
    verdict: "every-bill",
    rate: null,
    groupSize: null,
    summary: "Discretionary charge on all bills; rate not published",
    tracked: SECOND_PASS,
    checked: SECOND_PASS,
    changes: [],
  },
  {
    chain: "Browns Bar & Brasserie",
    slug: "browns",
    matcherName: "Browns Bar & Brasserie",
    verdict: "every-bill",
    rate: "10%",
    groupSize: null,
    summary: "Optional 10% added to all tables",
    tracked: SECOND_PASS,
    checked: SECOND_PASS,
    changes: [],
  },
  {
    chain: "All Bar One",
    slug: "all-bar-one",
    matcherName: "All Bar One",
    verdict: "every-bill",
    rate: "10%",
    groupSize: null,
    summary: "Discretionary 10% where there's table service",
    tracked: SECOND_PASS,
    checked: SECOND_PASS,
    changes: [],
  },
  {
    chain: "Cosy Club",
    slug: "cosy-club",
    matcherName: "Cosy Club",
    verdict: "every-bill",
    rate: "10%",
    groupSize: null,
    summary: "Discretionary 10% added to the bill",
    tracked: SECOND_PASS,
    checked: SECOND_PASS,
    changes: [],
  },
  {
    chain: "Côte",
    slug: "cote",
    matcherName: "Cote",
    verdict: "every-bill",
    rate: null,
    groupSize: null,
    summary: "Charge removable on request; rate not published",
    tracked: SECOND_PASS,
    checked: SECOND_PASS,
    changes: [],
  },
  {
    chain: "Pizza Express",
    slug: "pizza-express",
    matcherName: "Pizza Express",
    verdict: "groups",
    rate: "12.5%",
    groupSize: 8,
    summary: "12.5% for tables over 7",
    tracked: SECOND_PASS,
    checked: SECOND_PASS,
    changes: [],
  },
  {
    chain: "Zizzi",
    slug: "zizzi",
    matcherName: "Zizzi",
    verdict: "groups",
    rate: "10%",
    groupSize: 6,
    summary: "10% for groups of 6+, and on every bill in central London",
    tracked: SECOND_PASS,
    checked: SECOND_PASS,
    changes: [],
  },
  {
    chain: "ASK Italian",
    slug: "ask-italian",
    matcherName: "ASK Italian",
    verdict: "groups",
    rate: "10%",
    groupSize: 6,
    summary: "10% for bookings of 6+, and any size at London sites",
    tracked: SECOND_PASS,
    checked: SECOND_PASS,
    changes: [],
  },
  {
    chain: "Gourmet Burger Kitchen",
    slug: "gbk",
    matcherName: "Gourmet Burger Kitchen",
    verdict: "unclear",
    rate: "12.5%",
    groupSize: null,
    summary: "12.5% \"may be levied\": check in restaurant",
    tracked: SECOND_PASS,
    checked: SECOND_PASS,
    changes: [],
  },

  // --- checked, no published policy ---------------------------------------
  notPublished(
    "JD Wetherspoon",
    "wetherspoon",
    "We checked Wetherspoon's own FAQ hub, app terms and a current menu, and none of them says whether a service charge is added. The common claim that Wetherspoon never adds one comes from third parties, not from the company's own site."
  ),
  notPublished("Wagamama", "wagamama", TRONC_ONLY),
  notPublished("Nando's", "nandos"),
  notPublished("Bella Italia", "bella-italia", TRONC_ONLY),
  notPublished("Café Rouge", "cafe-rouge", TRONC_ONLY),
  notPublished("Byron", "byron"),
  notPublished("Pizza Hut Restaurants", "pizza-hut"),
  notPublished("Greene King", "greene-king"),
  notPublished("Hungry Horse", "hungry-horse"),
  notPublished("Harvester", "harvester"),
  notPublished("Toby Carvery", "toby-carvery"),
  notPublished("Beefeater", "beefeater"),
  notPublished("Brewers Fayre", "brewers-fayre"),
  notPublished("Table Table", "table-table"),
  notPublished("Ember Inns", "ember-inns"),
  notPublished("Sizzling Pubs", "sizzling-pubs"),
  notPublished("O'Neill's", "oneills"),
  notPublished("Stonehouse", "stonehouse"),
  notPublished("Castle", "castle-pubs"),
  notPublished("Premium Country Pubs", "premium-country-pubs"),
  notPublished("Marston's", "marstons"),
  notPublished("Slug & Lettuce", "slug-and-lettuce"),
  notPublished("Be At One", "be-at-one"),
  notPublished("Craft Union", "craft-union"),
  notPublished("Proper Pubs", "proper-pubs"),
  notPublished("Lounge", "lounge"),
];

export const VERDICT_META: Record<
  ChainVerdict,
  { label: string; className: string; order: number }
> = {
  "every-bill": { label: "Every bill", className: "charges", order: 0 },
  groups: { label: "Groups only", className: "groups", order: 1 },
  unclear: { label: "Unclear", className: "unclear", order: 2 },
  "not-published": { label: "Not published", className: "unclear", order: 3 },
};

export function getTrackedChain(slug: string): TrackedChain | undefined {
  return TRACKED_CHAINS.find((c) => c.slug === slug);
}

/** Most recent `checked` date across the tracker. */
export function trackerLastChecked(): string {
  return TRACKED_CHAINS.map((c) => c.checked).sort().at(-1) ?? SECOND_PASS;
}

/** Every change across all chains, newest first. */
export function allChanges(): (ChainChange & { chain: string; slug: string })[] {
  return TRACKED_CHAINS.flatMap((c) =>
    c.changes.map((ch) => ({ ...ch, chain: c.chain, slug: c.slug }))
  ).sort((a, b) => b.date.localeCompare(a.date));
}

/** "25 September 2026", for tracker pages and the CSV. */
export function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  });
}
