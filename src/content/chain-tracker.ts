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
const MONTHLY_2026_10 = "2026-10-14";

const notPublished = (
  chain: string,
  slug: string,
  note = "We checked this chain's own website, menus and booking terms and found no statement either way on whether a service charge is added to bills.",
  checked = SECOND_PASS,
  tracked = SECOND_PASS
): TrackedChain => ({
  chain,
  slug,
  verdict: "not-published",
  rate: null,
  groupSize: null,
  summary: "No published policy found",
  note,
  sourceUrl: null,
  tracked,
  checked,
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
    checked: MONTHLY_2026_10,
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
    checked: MONTHLY_2026_10,
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
    checked: MONTHLY_2026_10,
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
    checked: MONTHLY_2026_10,
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
    checked: MONTHLY_2026_10,
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
    checked: MONTHLY_2026_10,
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
    checked: MONTHLY_2026_10,
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
    checked: MONTHLY_2026_10,
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
    checked: MONTHLY_2026_10,
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
    checked: MONTHLY_2026_10,
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
    checked: MONTHLY_2026_10,
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
    checked: MONTHLY_2026_10,
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
    checked: MONTHLY_2026_10,
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
    checked: MONTHLY_2026_10,
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
    checked: MONTHLY_2026_10,
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
    checked: MONTHLY_2026_10,
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
    checked: MONTHLY_2026_10,
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
    checked: MONTHLY_2026_10,
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
    checked: MONTHLY_2026_10,
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
    checked: MONTHLY_2026_10,
    changes: [],
  },

  // --- added in the October 2026 monthly check ---------------------------
  {
    chain: "Vintage Inns",
    slug: "vintage-inns",
    verdict: "groups",
    rate: "10%",
    groupSize: 8,
    summary: "10% for tables of 8 or more",
    note: "Vintage Inns' own pub booking pages state that a discretionary 10% service charge is added to the bill for tables of 8 or more. The same wording appears on its current menus.",
    sourceUrl: "https://www.vintageinn.co.uk/restaurants/east/theswaninnhorning/tablebooking",
    tracked: MONTHLY_2026_10,
    checked: MONTHLY_2026_10,
    changes: [],
  },
  {
    chain: "Nicholson's",
    slug: "nicholsons",
    verdict: "groups",
    rate: "10%",
    groupSize: 6,
    summary: "10% for parties of 6+; menus say it may apply wherever there's table service",
    note: "Nicholson's own terms state a discretionary 10% service charge is added for parties of 6 or more. Its menus put it differently, saying a discretionary 10% may be added wherever table service is offered, so smaller tables may also see it.",
    sourceUrl: "https://www.nicholsonspubs.co.uk/termsandconditions",
    tracked: MONTHLY_2026_10,
    checked: MONTHLY_2026_10,
    changes: [],
  },
  {
    chain: "Young's",
    slug: "youngs",
    verdict: "groups",
    rate: "12.5%",
    groupSize: 4,
    summary: "12.5% for parties of 4+ (from Christmas booking terms)",
    note: "Young's own Christmas booking terms state a discretionary 12.5% service charge is added for parties of four or more, and for every party on Christmas Day. These are the only terms on its own site that mention a charge, so the rule outside the festive season isn't published.",
    sourceUrl: "https://www.youngs.co.uk/christmas-booking-terms-and-conditions",
    tracked: MONTHLY_2026_10,
    checked: MONTHLY_2026_10,
    changes: [],
  },
  {
    chain: "Bill's",
    slug: "bills",
    verdict: "every-bill",
    rate: "12.5%",
    groupSize: null,
    summary: "Discretionary 12.5% added to the bill",
    note: "Bill's own offer terms and its current menus state a discretionary 12.5% service charge is added to the bill.",
    sourceUrl: "https://bills-website.co.uk/terms-conditions/",
    tracked: MONTHLY_2026_10,
    checked: MONTHLY_2026_10,
    changes: [],
  },
  {
    chain: "Bistrot Pierre",
    slug: "bistrot-pierre",
    verdict: "every-bill",
    rate: "10%",
    groupSize: null,
    summary: "Discretionary 10% on all tables",
    note: "Bistrot Pierre's own menu states there is a 10% discretionary service charge for all tables, with all service charges and tips going to the team.",
    sourceUrl: "https://www.bistrotpierre.co.uk/propeller/uploads/2025/07/Bistrot-Pierre-Core-July-25_B.pdf",
    tracked: MONTHLY_2026_10,
    checked: MONTHLY_2026_10,
    changes: [],
  },
  {
    chain: "Brasserie Blanc",
    slug: "brasserie-blanc",
    verdict: "every-bill",
    rate: null,
    groupSize: null,
    summary: "Discretionary gratuity added to the bill; rate not published",
    note: "Brasserie Blanc's own terms state a discretionary gratuity is added to all reservations and is automatically added to the bill. No percentage is published.",
    sourceUrl: "https://brasserieblanc.com/terms/",
    tracked: MONTHLY_2026_10,
    checked: MONTHLY_2026_10,
    changes: [],
  },
  {
    chain: "Bread Meats Bread",
    slug: "bread-meats-bread",
    verdict: "every-bill",
    rate: "10%",
    groupSize: null,
    summary: "Optional 10% included in the bill",
    note: "Bread Meats Bread's own menu states an optional 10% service charge is included in the bill, shared among all the staff at that branch.",
    sourceUrl: "https://breadmeatsbread.com/wp-content/uploads/Bread-Meats-Bread-LUNCH-Menu-Apr25.pdf",
    tracked: MONTHLY_2026_10,
    checked: MONTHLY_2026_10,
    changes: [],
  },
  {
    chain: "Frankie & Benny's",
    slug: "frankie-and-bennys",
    verdict: "groups",
    rate: "10–12.5%",
    groupSize: 8,
    summary: "10% for parties of 8+ (12.5% at Paddington and Covent Garden)",
    note: "Frankie & Benny's own FAQ states an optional 10% service charge is added for parties of 8 or more, rising to 12.5% at its Paddington and Covent Garden restaurants.",
    sourceUrl: "https://www.frankieandbennys.com/faqs",
    tracked: MONTHLY_2026_10,
    checked: MONTHLY_2026_10,
    changes: [],
  },
  {
    chain: "Flat Iron",
    slug: "flat-iron",
    verdict: "every-bill",
    rate: "12.5%",
    groupSize: null,
    summary: "Optional 12.5% added automatically",
    note: "Flat Iron's own FAQ states an optional 12.5% service charge is added to the bill automatically, and removed if you ask.",
    sourceUrl: "https://flatironsteak.co.uk/faqs/",
    tracked: MONTHLY_2026_10,
    checked: MONTHLY_2026_10,
    changes: [],
  },
  {
    chain: "Wahaca",
    slug: "wahaca",
    verdict: "every-bill",
    rate: "12.5%",
    groupSize: null,
    summary: "Optional 12.5% added to bills",
    note: "Wahaca's own main menu states an optional 12.5% service charge is added to bills, with all tips going to the restaurant team. Its group menus describe the same 12.5% as discretionary.",
    sourceUrl: "https://www.wahaca.co.uk/wp-content/uploads/2025/12/0300_WAH_Main_Estate_Table_Menu_Winter_KCAL_241125_WEB.pdf",
    tracked: MONTHLY_2026_10,
    checked: MONTHLY_2026_10,
    changes: [],
  },
  {
    chain: "Kricket",
    slug: "kricket",
    verdict: "every-bill",
    rate: null,
    groupSize: null,
    summary: "Discretionary charge added to the bill; rate not published",
    note: "Kricket's own FAQ states a discretionary service charge is added to the bill and shared among its restaurant teams. No percentage is published.",
    sourceUrl: "https://kricket.co.uk/faqs/",
    tracked: MONTHLY_2026_10,
    checked: MONTHLY_2026_10,
    changes: [],
  },
  {
    chain: "Megan's",
    slug: "megans",
    verdict: "every-bill",
    rate: "12.5%",
    groupSize: null,
    summary: "Discretionary 12.5% added to the bill",
    note: "Megan's own bookings policy states a discretionary 12.5% service charge is added to the bill, all of which goes to the team.",
    sourceUrl: "https://megans.co.uk/bookings-policy-megans/",
    tracked: MONTHLY_2026_10,
    checked: MONTHLY_2026_10,
    changes: [],
  },
  {
    chain: "Rick Stein",
    slug: "rick-stein",
    verdict: "every-bill",
    rate: "12.5%",
    groupSize: null,
    summary: "Discretionary 12.5% added to the bill",
    note: "Menus published on Rick Stein's own site state a discretionary 12.5% service charge is added to the bill. The menus found are sample menus for individual restaurants.",
    sourceUrl: "https://rickstein.com/wp-content/uploads/2024/02/Sandbanks-Sample-ALC-Menu-May-2025.pdf",
    tracked: MONTHLY_2026_10,
    checked: MONTHLY_2026_10,
    changes: [],
  },
  {
    chain: "Roka",
    slug: "roka",
    verdict: "every-bill",
    rate: "14.5%",
    groupSize: null,
    summary: "Discretionary 14.5% added to the bill",
    note: "Roka's own menu page states a discretionary 14.5% service charge is added to the bill. The menu found is its Charlotte Street sample menu.",
    sourceUrl: "https://www.rokarestaurant.com/en/roka-charlotte-street-london/menu",
    tracked: MONTHLY_2026_10,
    checked: MONTHLY_2026_10,
    changes: [],
  },
  {
    chain: "Sticks'n'Sushi",
    slug: "sticks-n-sushi",
    verdict: "every-bill",
    rate: "12.5%",
    groupSize: null,
    summary: "Optional 12.5% added to the bill",
    note: "Sticks'n'Sushi's own site states an optional 12.5% service charge is added to the bill, and its terms say any discretionary charge is shown before you pay and can be changed or removed on request.",
    sourceUrl: "https://www.sticksnsushi.com/gb/en/lp/bottomless-brunch/",
    tracked: MONTHLY_2026_10,
    checked: MONTHLY_2026_10,
    changes: [],
  },
  {
    chain: "Di Maggio's",
    slug: "di-maggios",
    verdict: "every-bill",
    rate: "10%",
    groupSize: null,
    summary: "Optional 10% added to the bill",
    note: "A Di Maggio's menu published on its own site states an optional and discretionary 10% service charge is added to the bill, all of which goes to the team.",
    sourceUrl: "https://www.dimaggios.co.uk/s/DM-TLD-A4-LUNCH-MENU-Nov-24.pdf",
    tracked: MONTHLY_2026_10,
    checked: MONTHLY_2026_10,
    changes: [],
  },

  // --- checked, no published policy ---------------------------------------
  notPublished(
    "JD Wetherspoon",
    "wetherspoon",
    "We checked Wetherspoon's own FAQ hub, app terms and a current menu, and none of them says whether a service charge is added. The common claim that Wetherspoon never adds one comes from third parties, not from the company's own site.",
    MONTHLY_2026_10
  ),
  notPublished("Wagamama", "wagamama", TRONC_ONLY, MONTHLY_2026_10),
  notPublished("Nando's", "nandos"),
  notPublished("Bella Italia", "bella-italia", TRONC_ONLY, MONTHLY_2026_10),
  notPublished("Café Rouge", "cafe-rouge", TRONC_ONLY, MONTHLY_2026_10),
  notPublished("Byron", "byron", undefined, MONTHLY_2026_10),
  notPublished("Pizza Hut Restaurants", "pizza-hut"),
  notPublished("Greene King", "greene-king", undefined, MONTHLY_2026_10),
  notPublished("Hungry Horse", "hungry-horse", undefined, MONTHLY_2026_10),
  notPublished("Harvester", "harvester", undefined, MONTHLY_2026_10),
  notPublished("Toby Carvery", "toby-carvery"),
  notPublished("Beefeater", "beefeater"),
  notPublished("Brewers Fayre", "brewers-fayre"),
  notPublished("Table Table", "table-table"),
  notPublished("Ember Inns", "ember-inns", undefined, MONTHLY_2026_10),
  notPublished("Sizzling Pubs", "sizzling-pubs", undefined, MONTHLY_2026_10),
  notPublished("O'Neill's", "oneills"),
  notPublished("Stonehouse", "stonehouse", undefined, MONTHLY_2026_10),
  notPublished("Castle", "castle-pubs", undefined, MONTHLY_2026_10),
  notPublished("Premium Country Pubs", "premium-country-pubs"),
  notPublished("Marston's", "marstons", undefined, MONTHLY_2026_10),
  notPublished("Slug & Lettuce", "slug-and-lettuce", undefined, MONTHLY_2026_10),
  notPublished("Be At One", "be-at-one", undefined, MONTHLY_2026_10),
  notPublished("Craft Union", "craft-union"),
  notPublished("Proper Pubs", "proper-pubs"),
  notPublished("Lounge", "lounge", undefined, MONTHLY_2026_10),
  notPublished("Chiquito", "chiquito", TRONC_ONLY, MONTHLY_2026_10, MONTHLY_2026_10),
  notPublished("Mowgli Street Food", "mowgli", undefined, MONTHLY_2026_10, MONTHLY_2026_10),
  notPublished("Pho", "pho", "Pho's own 2026 menus tell diners to ask staff or check their receipt for its service charge policy, and its FAQ doesn't say whether a charge is added, so the policy itself isn't published.", MONTHLY_2026_10, MONTHLY_2026_10),
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
