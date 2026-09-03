import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getSitemapShardCount } from "@/lib/sitemap-shards";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // The restaurant sitemap is sharded (see sitemap.ts) — every shard has
  // to be listed here by URL, so this computes the same shard count the
  // same way, from the shared helper, rather than guessing a number that
  // could drift out of sync as the dataset grows.
  const shardCount = await getSitemapShardCount();
  const sitemaps = Array.from(
    { length: shardCount },
    (_, id) => `${SITE_URL}/sitemap/${id}.xml`
  );

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: sitemaps,
    host: SITE_URL,
  };
}
