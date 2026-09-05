import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default async function robots(): Promise<MetadataRoute.Robots> {
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
    // The restaurant sitemap is sharded across /sitemap/<id>.xml (see
    // sitemap.ts) — but rather than listing every shard here (which would
    // have to be kept in sync with the shard count separately), this
    // points at the single /sitemap.xml index (src/app/sitemap.xml/route.ts)
    // that lists them instead. One canonical URL, standard sitemap-index
    // format, and it can never drift out of sync with the real shard count
    // since both read it from the same shared helper.
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
