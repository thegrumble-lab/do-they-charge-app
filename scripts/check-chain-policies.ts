/**
 * Assertions for matchChainPolicy(), runnable with `npm run check:chains`.
 *
 * This exists because every serious bug in chain matching has been a false
 * positive on a name that merely contains a brand word, and each one was
 * found in live FHRS data rather than by reading the code. "The Ivy" alone
 * matched a farm shop, a fish bar, a garden centre and several pubs;
 * "Cote" matched "Cote Du Nord"; a bare word-boundary check on "presto"
 * would have swallowed every listing in Preston.
 *
 * So the cases below are mostly negative: real names that must match
 * NOTHING. Add a case here whenever a false positive turns up, before
 * fixing the matcher — the regression is the point.
 *
 * Exits non-zero on any failure, so it can gate a sync run.
 */
import { matchChainPolicy } from "../src/lib/chain-policies";

// [name, expected chainName or null]
const cases: [string, string | null][] = [
  // --- previously passing, must stay passing
  ["Zizzi", "Zizzi"],
  ["Pizza Express", "Pizza Express"],
  ["PizzaExpress Leeds", "Pizza Express"],
  ["ASK Italian", "ASK Italian"],
  ["Ask Mums Kitchen", null],
  ["Browns Bar & Brasserie", "Browns Bar & Brasserie"],
  ["Browns Cafe", null],
  ["Miller & Carter", "Miller & Carter"],
  ["Miller And Carter Bolton", "Miller & Carter"],
  ["All Bar One", "All Bar One"],
  ["Cosy Club", "Cosy Club"],
  ["Dishoom", "Dishoom"],
  ["Giggling Squid", "Giggling Squid"],
  ["Honest Burgers", "Honest Burgers"],
  ["Las Iguanas", "Las Iguanas"],
  ["Rosa's Thai Cafe", "Rosa's Thai"],
  ["Banana Tree Soho", "Banana Tree"],
  ["Wildwood", "Wildwood"],
  ["Wildwood Kitchen Stratford", "Wildwood"],
  ["The Wildwood Cafe", null],
  ["Gourmet Burger Kitchen", "Gourmet Burger Kitchen"],
  ["GBK", "Gourmet Burger Kitchen"],
  ["Franco Manca", "Franco Manca"],
  ["TGI Fridays", "TGI Fridays"],
  ["Turtle Bay", "Turtle Bay"],
  ["Prezzo", "Prezzo"],

  // --- reported Ivy false positives, must all be null now
  ["The Ivy Farm Shop", null],
  ["The Ivy Wall", null],
  ["The Ivy Street Centre", null],
  ["The Ivy Tree", null],
  ["The Ivy Bean Limited", null],
  ["The Ivy Fish Bar Limited", null],
  ["The Ivy Green Pub", null],
  ["The Ivy Lounge", null],
  ["The Ivy Kitchen", null],
  ["The Ivy", null],
  ["The Ivy Restaurant", null],
  ["The Ivy House", null],
  ["The Ivy Leaf Club", null],
  ["The Ivy Garden Centre Cafe", null],
  // --- Ivy Collection patterns, must still match
  ["The Ivy Clifton Brasserie", "The Ivy Collection"],
  ["The Ivy Asia", "The Ivy Collection"],
  ["The Ivy Cafe Wimbledon", "The Ivy Collection"],
  ["The Ivy City Garden", "The Ivy Collection"],
  ["The Ivy Soho Brasserie", "The Ivy Collection"],

  // --- reported Cote false positives
  ["Cote Du Nord", null],
  ["The Cote Kitchen At Churncote", null],
  ["Cotes Cafe", null],
  ["The Cotswold Arms", null],
  // --- Cote must still match
  ["Cote Brasserie", "Cote"],
  ["Côte", "Cote"],
  ["Cote Bath", "Cote"],

  // --- reported combo false positives
  ["Zizzi also TA Coco Di Mama", null],
  ["Zizzi & Coco Di Mama", null],
  ["ASK Italian inc. Coco Di Mama", null],
  ["Las Iguanas and Kickass Burrito", null],
  ["Las Iguanas & Kick Ass Burrito", null],
  ["Las Iguanas, Super Nonna", null],
  ["Las Iguanas and Blazing Bird", null],
  ["Las Iguanas Bang Bang Burrito", null],
  ["Las Iguanas and Presto", null],
  ["GBK Restaurant Hub", null],
  ["GBK Rest Hub", null],
  ["GBK & Tap and Barrel", null],
  ["Zizzi t/a Coco di Mama", null],
  // --- "Preston" must NOT be read as "Presto"
  ["Zizzi Preston", "Zizzi"],
  ["Las Iguanas Prestonfield", "Las Iguanas"],
];

let fails = 0;
for (const [name, expected] of cases) {
  const row = { name, area: "Somewhere", address: "1 High St" };
  const policy = matchChainPolicy(row);
  const got = policy ? policy.chainName : null;
  const ok = got === expected;
  if (!ok) fails += 1;
  console.log(
    `${ok ? "ok  " : "FAIL"}  ${name.padEnd(36)} -> ${String(got).padEnd(26)} expected ${expected}`
  );
}
console.log(`\n${cases.length - fails}/${cases.length} passed`);
process.exit(fails === 0 ? 0 : 1);
