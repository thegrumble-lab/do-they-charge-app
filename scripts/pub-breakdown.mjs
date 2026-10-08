// One-off, read-only: splits the press figures into pubs vs restaurants/cafes.
//
// The restaurants table doesn't keep the FSA business type (sync-fhrs.ts only
// uses it to filter), so this looks each listing with a stated policy up on the
// FSA ratings API by FHRSID. Runs in GitHub Actions (normal internet access);
// writes results to out/pub-breakdown.json and out/pub-breakdown.md.
import fs from "node:fs/promises";

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) throw new Error("Missing Supabase settings");
const H = { apikey: KEY, authorization: `Bearer ${KEY}` };

async function rest(path, from = 0, to = 999) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, { headers: { ...H, range: `${from}-${to}`, "range-unit": "items" } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}
async function all(path) {
  const out = [];
  for (let i = 0; ; i += 1000) {
    const page = await rest(path, i, i + 999);
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

// Latest report per restaurant (same ordering as the site: report_date, then created_at).
const reports = await all("reports?select=restaurant_id,status,pct,source,report_date,created_at&order=restaurant_id,report_date,created_at");
const latest = new Map();
for (const r of reports) latest.set(r.restaurant_id, r);
const POLICY = new Set(["charges", "groups", "no-charge"]);
const withPolicy = [...latest.values()].filter((r) => POLICY.has(r.status));

// Restaurant rows for those ids.
const ids = withPolicy.map((r) => r.restaurant_id);
const rows = new Map();
for (let i = 0; i < ids.length; i += 100) {
  const chunk = ids.slice(i, i + 100);
  const got = await rest(`restaurants?select=id,fhrsid,name,area,is_active&id=in.(${chunk.join(",")})`, 0, 999);
  for (const g of got) rows.set(g.id, g);
}

// FSA business type per FHRSID.
async function fsaType(fhrsid) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://api.ratings.food.gov.uk/Establishments/${fhrsid}`, { headers: { "x-api-version": "2", accept: "application/json" } });
      if (res.status === 404) return { id: null, name: "Not found on FSA" };
      if (!res.ok) throw new Error(String(res.status));
      const j = await res.json();
      return { id: j.BusinessTypeID ?? null, name: j.BusinessType ?? "Unknown" };
    } catch {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  return { id: null, name: "Lookup failed" };
}

const items = withPolicy.map((r) => ({ r, row: rows.get(r.restaurant_id) })).filter((x) => x.row && x.row.is_active !== false);
const types = new Map();
let next = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (next < items.length) {
      const it = items[next++];
      if (it.row.fhrsid) types.set(it.row.fhrsid, await fsaType(it.row.fhrsid));
      await new Promise((r) => setTimeout(r, 120));
    }
  }),
);

const group = (t) => (t?.id === 7843 ? "Pub/bar/nightclub" : t?.id === 1 ? "Restaurant/Cafe/Canteen" : t?.name ?? "Unknown");
const tally = {};
const pubs = [];
for (const { r, row } of items) {
  const g = group(types.get(row.fhrsid));
  tally[g] ??= { total: 0, charges: 0, groups: 0, "no-charge": 0, bySource: {} };
  tally[g].total++;
  tally[g][r.status]++;
  tally[g].bySource[r.source] = (tally[g].bySource[r.source] ?? 0) + 1;
  if (g === "Pub/bar/nightclub") pubs.push({ name: row.name, area: row.area, status: r.status, pct: r.pct, source: r.source });
}

const result = { generatedAt: new Date().toISOString(), listingsWithPolicy: items.length, byType: tally, pubs: pubs.sort((a, b) => a.name.localeCompare(b.name)) };
await fs.mkdir("out", { recursive: true });
await fs.writeFile("out/pub-breakdown.json", JSON.stringify(result, null, 2));
const md = [
  `# Pub breakdown (${result.generatedAt.slice(0, 10)})`,
  `Listings with a stated policy: ${items.length}`,
  "",
  "| Type | Total | Every bill | Groups only | No charge |",
  "|---|---|---|---|---|",
  ...Object.entries(tally).map(([k, v]) => `| ${k} | ${v.total} | ${v.charges} | ${v.groups} | ${v["no-charge"]} |`),
  "",
  `Pubs listed: ${pubs.length}`,
  ...pubs.slice(0, 60).map((p) => `- ${p.name} (${p.area}): ${p.status}${p.pct != null ? ` ${p.pct}%` : ""} [${p.source}]`),
].join("\n");
await fs.writeFile("out/pub-breakdown.md", md);
console.log(md);
