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
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: "/api/",
      },
      // ClaudeBot was sweeping every one of the ~363 /browse/<area> pages
      // roughly once every 9 seconds — fast enough to complete a full lap
      // faster than those pages' ISR revalidate window, so nearly every
      // hit was a guaranteed cache miss requiring a fresh Supabase query.
      // That drove sustained DB load and pushed the project over its
      // egress quota. Anthropic's crawler docs confirm ClaudeBot honours
      // Crawl-delay, so this throttles it to something that can't outrun
      // the revalidate window without blocking it outright.
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: "/api/",
        crawlDelay: 30,
      },
    ],
    sitemap: sitemaps,
    host: SITE_URL,
  };
}
