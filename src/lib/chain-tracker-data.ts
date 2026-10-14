import "server-only";
import { getPgPool } from "./db";
import { CHAIN_POLICIES } from "./chain-policies";
import type { ReportStatus } from "./types";
import { TRACKED_CHAINS, type TrackedChain } from "@/content/chain-tracker";

/**
 * Data behind /chains. The policy text comes from chain-policies.ts for
 * every chain the sync matches automatically, so the tracker page, the
 * per-branch reports and the press reference all quote the same source.
 */

export interface ChainView extends TrackedChain {
  note: string;
  sourceUrl: string | null;
  /** Active branches whose current report cites this chain's policy. */
  branches: number | null;
}

export interface ChainBranch {
  name: string;
  area: string;
  areaSlug: string;
  slug: string;
  address: string;
  postcode: string;
  status: ReportStatus;
  pct: number | null;
}

function policyFor(c: TrackedChain): { note: string; sourceUrl: string | null } {
  if (c.matcherName) {
    const policy = CHAIN_POLICIES.find((p) => p.chainName === c.matcherName);
    if (policy) {
      const r = policy.resolve({ name: policy.chainName, area: "", address: "" });
      return { note: r.note, sourceUrl: r.sourceUrl };
    }
  }
  return { note: c.note ?? "", sourceUrl: c.sourceUrl ?? null };
}

// Latest report per active restaurant, among restaurants that have ever had
// a report citing one of the given sources. A later diner report on a branch
// takes precedence, so it drops out of the chain's count.
const LATEST_CITING = `
  with candidates as (
    select distinct restaurant_id from reports where source_url = any($1::text[])
  ),
  latest as (
    select distinct on (rep.restaurant_id)
           rep.restaurant_id, rep.source_url, rep.status, rep.pct
    from reports rep
    join candidates c on c.restaurant_id = rep.restaurant_id
    order by rep.restaurant_id, rep.report_date desc, rep.created_at desc
  )`;

async function branchCounts(sources: string[]): Promise<Map<string, number> | null> {
  if (sources.length === 0) return new Map();
  try {
    const { rows } = await getPgPool().query<{ source_url: string; n: string }>(
      `${LATEST_CITING}
       select l.source_url, count(*)::text as n
       from latest l
       join restaurants r on r.id = l.restaurant_id
       where r.is_active and l.source_url = any($1::text[])
       group by l.source_url`,
      [sources]
    );
    return new Map(rows.map((r) => [r.source_url, Number(r.n)]));
  } catch (err) {
    // The tracker still renders without counts if the direct connection is
    // unavailable; the counts are a bonus, not the content.
    console.error("chain branch counts failed", err);
    return null;
  }
}

export async function getChainViews(): Promise<ChainView[]> {
  const withPolicy = TRACKED_CHAINS.map((c) => ({ ...c, ...policyFor(c) }));
  const matchedSources = withPolicy
    .filter((c) => c.matcherName && c.sourceUrl)
    .map((c) => c.sourceUrl as string);
  const counts = await branchCounts(matchedSources);
  return withPolicy.map((c) => ({
    ...c,
    branches:
      c.matcherName && c.sourceUrl && counts ? counts.get(c.sourceUrl) ?? 0 : null,
  }));
}

export async function getChainView(slug: string): Promise<ChainView | null> {
  const c = TRACKED_CHAINS.find((x) => x.slug === slug);
  if (!c) return null;
  const policy = policyFor(c);
  let branches: number | null = null;
  if (c.matcherName && policy.sourceUrl) {
    const counts = await branchCounts([policy.sourceUrl]);
    branches = counts ? counts.get(policy.sourceUrl) ?? 0 : null;
  }
  return { ...c, ...policy, branches };
}

export async function getChainBranches(sourceUrl: string): Promise<ChainBranch[]> {
  try {
    const { rows } = await getPgPool().query<{
      name: string;
      area: string;
      area_slug: string;
      slug: string;
      address: string | null;
      postcode: string | null;
      status: ReportStatus;
      pct: string | null;
    }>(
      `${LATEST_CITING}
       select r.name, r.area, r.area_slug, r.slug, r.address, r.postcode,
              l.status, l.pct::text as pct
       from latest l
       join restaurants r on r.id = l.restaurant_id
       where r.is_active and l.source_url = ($1::text[])[1]
       order by r.area, r.name`,
      [[sourceUrl]]
    );
    return rows.map((r) => ({
      name: r.name,
      area: r.area,
      areaSlug: r.area_slug,
      slug: r.slug,
      address: r.address ?? "",
      postcode: r.postcode ?? "",
      status: r.status,
      pct: r.pct === null ? null : Number(r.pct),
    }));
  } catch (err) {
    console.error("chain branches failed", err);
    return [];
  }
}
