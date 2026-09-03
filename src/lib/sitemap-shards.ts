import { getRestaurantCount } from "./data";

// Google's own limit is 50,000 URLs per sitemap file; stay well under it
// so a page of restaurants plus the area/static entries added to shard 0
// never gets close. Shared between sitemap.ts (which fetches this many
// shards) and robots.ts (which has to reference every one of them by
// URL) so the two can never disagree about how many shards exist.
export const RESTAURANTS_PER_SITEMAP = 40000;

export async function getSitemapShardCount(): Promise<number> {
  const total = await getRestaurantCount();
  return Math.max(1, Math.ceil(total / RESTAURANTS_PER_SITEMAP));
}
