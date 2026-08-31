// Run via `npm run sync:fhrs` (uses tsx, so it can import src/lib/slug.ts
// directly — same slug logic as the app, no duplication). See HANDOFF.md
// ("Automated weekly sync") for the
// full design rationale. Short version:
//
//   - Downloads the FSA's national FHRS_All_en-GB.csv (this has to run
//     somewhere with normal internet access — the Claude cloud sandbox and
//     the dev machine's local shell both sit behind an egress allowlist
//     that blocks the source domain outright, which is why this is a
//     GitHub Actions script rather than something run from there).
//   - Filters to BusinessTypeID 1 (Restaurant/Cafe/Canteen) and 7843
//     (Pub/bar/nightclub) — the agreed scope; takeaways (7844) are
//     deliberately excluded.
//   - Upserts by fhrsid (unique constraint: restaurants_fhrsid_key).
//   - Anything currently active in our DB but absent from this run's
//     filtered feed gets SOFT-deleted (is_active = false, removed_at =
//     now()), never a hard DELETE — preserves diner-submitted reports and
//     is fully reversible. Rows with no fhrsid (diner-added, not
//     FSA-sourced) are never touched.
//   - Refuses to write anything if the feed looks implausibly small
//     compared to what's already live — a guard against a truncated
//     download silently wiping out the site.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run sync:fhrs
//   DRY_RUN=1 SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run sync:fhrs

import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse";
import { Readable } from "node:stream";
import { slugify } from "../src/lib/slug";

const FHRS_URL =
  "https://safhrsprodstorage.blob.core.windows.net/opendatafileblobstorage/FHRS_All_en-GB.csv";

// Restaurant/Cafe/Canteen, Pub/bar/nightclub. Takeaway/sandwich shop
// (7844) is deliberately excluded — see HANDOFF.md.
const ALLOWED_BUSINESS_TYPE_IDS = new Set([1, 7843]);

const DRY_RUN = /^(1|true)$/i.test(process.env.DRY_RUN ?? "");
const PAGE_SIZE = 1000;
const WRITE_BATCH_SIZE = 500;
// If the filtered feed comes back with fewer rows than this fraction of
// what's currently active, something upstream is almost certainly broken
// (truncated download, changed schema, wrong filter) — abort rather than
// soft-deleting most of the site.
const MIN_FEED_RATIO = 0.5;
const MIN_FEED_ABSOLUTE = 20000;

function must(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

const supabase = createClient(
  must("SUPABASE_URL"),
  must("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } }
);

// --- helpers ---------------------------------------------------------

// csv-parse with { columns: true } yields one plain string-keyed object
// per row. We read defensively (see downloadAndFilter's lat/lng handling)
// rather than trusting an exact schema, so this stays a loose string map.
type CsvRecord = Record<string, string | undefined>;

function pick(record: CsvRecord, ...candidates: string[]): string | undefined {
  for (const c of candidates) {
    if (record[c] !== undefined && record[c] !== "") return record[c];
  }
  return undefined;
}

function buildAddress(record: CsvRecord): string {
  return [
    record.AddressLine1,
    record.AddressLine2,
    record.AddressLine3,
    record.AddressLine4,
  ]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

/**
 * Computes a fresh, collision-free area_slug/slug for a genuinely NEW
 * restaurant. `reserved` starts seeded with every (area_slug, slug) pair
 * already in the DB and accumulates new assignments as we go, so two new
 * restaurants in the same run can't collide with each other either.
 * Existing restaurants' slugs are NEVER touched — this is only called
 * for rows with no existing DB match.
 */
function uniqueSlug(
  area: string,
  name: string,
  reserved: Set<string>
): { areaSlug: string; slug: string } {
  const areaSlug = slugify(area);
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let n = 2;
  while (reserved.has(`${areaSlug}/${slug}`)) {
    slug = `${baseSlug}-${n}`;
    n += 1;
  }
  reserved.add(`${areaSlug}/${slug}`);
  return { areaSlug, slug };
}

interface ExistingRow {
  id: string;
  fhrsid: string;
  area_slug: string;
  slug: string;
  is_active: boolean;
}

async function fetchAllExisting(): Promise<{
  byFhrsid: Map<string, ExistingRow>;
  reservedSlugs: Set<string>;
}> {
  // id, fhrsid, area_slug, slug, is_active for every row that has an
  // fhrsid (rows with no fhrsid are diner-added, not FSA-sourced, and
  // this sync never touches them). Paginated — see HANDOFF.md re: the
  // PostgREST default row-cap bug this same pattern fixed elsewhere.
  const byFhrsid = new Map<string, ExistingRow>();
  const reservedSlugs = new Set<string>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, fhrsid, area_slug, slug, is_active")
      .not("fhrsid", "is", null)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    for (const row of (data ?? []) as ExistingRow[]) {
      byFhrsid.set(row.fhrsid, row);
      reservedSlugs.add(`${row.area_slug}/${row.slug}`);
    }
    if (!data || data.length < PAGE_SIZE) break;
  }
  return { byFhrsid, reservedSlugs };
}

async function currentActiveCount(): Promise<number> {
  const { count, error } = await supabase
    .from("restaurants")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);
  if (error) throw error;
  return count ?? 0;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// --- download + parse --------------------------------------------------

interface FeedRow {
  fhrsid: string;
  name: string;
  area: string;
  businessTypeId: number;
  postcode: string;
  address: string;
  lat: string | null;
  lng: string | null;
}

async function downloadAndFilter(): Promise<FeedRow[]> {
  console.log(`Downloading ${FHRS_URL} ...`);
  const res = await fetch(FHRS_URL);
  if (!res.ok || !res.body) {
    throw new Error(`Download failed: HTTP ${res.status}`);
  }

  // res.body is a WHATWG ReadableStream; Readable.fromWeb's typings want
  // Node's own (structurally identical) ReadableStream type, hence the cast.
  const parser = Readable.fromWeb(
    res.body as unknown as import("node:stream/web").ReadableStream<Uint8Array>
  ).pipe(
    parse({ columns: true, bom: true, relax_quotes: true, skip_empty_lines: true })
  );

  const rows: FeedRow[] = [];
  const typeCounts = new Map<number, number>();
  let totalRows = 0;
  let missingCoreFields = 0;

  for await (const rawRecord of parser) {
    const record = rawRecord as CsvRecord;
    totalRows += 1;
    const businessTypeId = parseInt(record.BusinessTypeID ?? "", 10);
    typeCounts.set(businessTypeId, (typeCounts.get(businessTypeId) ?? 0) + 1);
    if (!ALLOWED_BUSINESS_TYPE_IDS.has(businessTypeId)) continue;

    const fhrsid = (record.FHRSID ?? "").trim();
    const name = (record.BusinessName ?? "").trim();
    const area = (record.LocalAuthorityName ?? "").trim();
    if (!fhrsid || !name || !area) {
      missingCoreFields += 1;
      continue;
    }

    const lng = pick(record, "Geocode.Longitude", "geocode.longitude", "Longitude", "longitude");
    const lat = pick(record, "Geocode.Latitude", "geocode.latitude", "Latitude", "latitude");

    rows.push({
      fhrsid,
      name,
      area,
      businessTypeId,
      postcode: (record.PostCode ?? "").trim(),
      address: buildAddress(record),
      lat: lat ?? null,
      lng: lng ?? null,
    });
  }

  console.log(`Parsed ${totalRows} total rows from the feed.`);
  console.log(
    `Matched ${rows.length} rows in scope (BusinessTypeID ${[...ALLOWED_BUSINESS_TYPE_IDS].join(
      ", "
    )}); skipped ${missingCoreFields} in-scope rows missing a core field.`
  );

  return rows;
}

// --- main ---------------------------------------------------------------

async function main() {
  const feedRows = await downloadAndFilter();
  const activeBefore = await currentActiveCount();

  if (
    feedRows.length < MIN_FEED_ABSOLUTE ||
    feedRows.length < activeBefore * MIN_FEED_RATIO
  ) {
    console.error(
      `Refusing to proceed: feed produced only ${feedRows.length} in-scope rows, ` +
        `vs. ${activeBefore} currently active in the DB (minimum expected: ` +
        `${Math.max(MIN_FEED_ABSOLUTE, Math.round(activeBefore * MIN_FEED_RATIO))}). ` +
        `This looks like a truncated download or a broken filter, not a real ` +
        `change in the data — nothing was written.`
    );
    process.exit(1);
  }

  const { byFhrsid, reservedSlugs } = await fetchAllExisting();

  interface UpsertRow {
    fhrsid: string;
    area_slug: string;
    slug: string;
    name: string;
    area: string;
    address: string;
    postcode: string;
    lat: string | null;
    lng: string | null;
    is_active: true;
    removed_at: null;
  }

  const toUpsert: UpsertRow[] = [];
  let newCount = 0;
  let updatedCount = 0;
  let reactivatedCount = 0;

  for (const row of feedRows) {
    const existing = byFhrsid.get(row.fhrsid);
    let areaSlug: string, slug: string;
    if (existing) {
      // Never regenerate an existing restaurant's slug — that would break
      // whatever URL is already live/indexed for it.
      areaSlug = existing.area_slug;
      slug = existing.slug;
      if (existing.is_active) updatedCount += 1;
      else reactivatedCount += 1;
    } else {
      ({ areaSlug, slug } = uniqueSlug(row.area, row.name, reservedSlugs));
      newCount += 1;
    }

    toUpsert.push({
      fhrsid: row.fhrsid,
      area_slug: areaSlug,
      slug,
      name: row.name,
      area: row.area,
      address: row.address,
      postcode: row.postcode,
      lat: row.lat,
      lng: row.lng,
      is_active: true,
      removed_at: null,
    });
  }

  const feedFhrsids = new Set(feedRows.map((r) => r.fhrsid));
  const toDeactivateIds: string[] = [];
  for (const [fhrsid, existing] of byFhrsid) {
    if (existing.is_active && !feedFhrsids.has(fhrsid)) {
      toDeactivateIds.push(existing.id);
    }
  }

  console.log("");
  console.log("=== Sync summary ===");
  console.log(`New restaurants to insert:        ${newCount}`);
  console.log(`Existing restaurants to update:    ${updatedCount}`);
  console.log(`Previously-delisted, now back:     ${reactivatedCount}`);
  console.log(`Existing restaurants to deactivate: ${toDeactivateIds.length}`);
  console.log(`Active count before this run:      ${activeBefore}`);
  console.log(
    `Active count after this run (est.): ${activeBefore + newCount + reactivatedCount - toDeactivateIds.length}`
  );

  const summaryLines = [
    "## FHRS sync summary",
    "",
    `- Mode: ${DRY_RUN ? "**DRY RUN — nothing written**" : "live"}`,
    `- New restaurants: ${newCount}`,
    `- Updated restaurants: ${updatedCount}`,
    `- Reactivated (previously delisted): ${reactivatedCount}`,
    `- Deactivated (no longer in scope / closed): ${toDeactivateIds.length}`,
    `- Active before: ${activeBefore}`,
    `- Active after (est.): ${activeBefore + newCount + reactivatedCount - toDeactivateIds.length}`,
  ];
  const stepSummaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (stepSummaryPath) {
    const fs = await import("node:fs/promises");
    await fs.appendFile(stepSummaryPath, summaryLines.join("\n") + "\n");
  }

  if (DRY_RUN) {
    console.log("");
    console.log("DRY RUN — no writes performed.");
    return;
  }

  console.log("");
  console.log(`Upserting ${toUpsert.length} rows in batches of ${WRITE_BATCH_SIZE}...`);
  for (const batch of chunk(toUpsert, WRITE_BATCH_SIZE)) {
    const { error } = await supabase
      .from("restaurants")
      .upsert(batch, { onConflict: "fhrsid" });
    if (error) throw error;
  }

  console.log(
    `Deactivating ${toDeactivateIds.length} rows in batches of ${WRITE_BATCH_SIZE}...`
  );
  const removedAt = new Date().toISOString();
  for (const batch of chunk(toDeactivateIds, WRITE_BATCH_SIZE)) {
    const { error } = await supabase
      .from("restaurants")
      .update({ is_active: false, removed_at: removedAt })
      .in("id", batch);
    if (error) throw error;
  }

  console.log("");
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
