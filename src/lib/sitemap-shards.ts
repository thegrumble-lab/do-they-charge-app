import { getRestaurantCount } from "./data";

// Google's own limit is 50,000 URLs per sitemap file, but the binding
// constraint here is Vercel's 4.5MB cap on a function's response body,
// not Google's. Each <url> entry is ~153 bytes, so 40,000 per shard (the
// original value, chosen against Google's limit alone) would produce a
// ~6MB response that Vercel refuses to return at all. 10,000 keeps each
// shard around 1.5MB — comfortably under both limits, with room for the
// entries to grow — at the cost of more shards, which costs nothing:
// they're listed in the /sitemap.xml index, and Google is perfectly happy
// crawling a couple of dozen sitemaps.
//
// This was only survivable before because of the bug fixed alongside it:
// the shard query went through PostgREST, which silently capped every
// response at 1,000 rows, so each shard emitted 1,000 URLs no matter what
// this number said. See src/app/sitemap/[id]/route.ts and HANDOFF.md.
//
// Shared between the sitemap index (which lists this many shards) and the
// shard route itself, so the two can never disagree about how many exist.
export const RESTAURANTS_PER_SITEMAP = 10000;

export async function getSitemapShardCount(): Promise<number> {
  const total = await getRestaurantCount();
  return Math.max(1, Math.ceil(total / RESTAURANTS_PER_SITEMAP));
}
