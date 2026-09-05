import { SITE_URL } from "@/lib/site";
import { getSitemapShardCount } from "@/lib/sitemap-shards";

// The shards themselves live at /sitemap/<id>.xml (src/app/sitemap/[id]/
// route.ts). This is the root index every URL-inspection tool and Search
// Console's own "sitemap.xml" convention expects to exist — a standard
// sitemap *index* (the format designed for exactly this — pointing at
// other sitemaps rather than listing URLs itself), built from the same
// shard-count helper the shard route and robots.ts already share, so it
// can never list a shard that doesn't exist or omit one that does.
//
// This has to be a plain Route Handler, not Next's sitemap.ts metadata
// convention — see the comment at the top of src/app/sitemap/[id]/route.ts
// for why the two can't coexist at this path.
export const revalidate = 21600;

export async function GET() {
  const shardCount = await getSitemapShardCount();
  const shardUrls = Array.from(
    { length: shardCount },
    (_, id) => `${SITE_URL}/sitemap/${id}.xml`
  );

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${shardUrls.map((url) => `  <sitemap>\n    <loc>${url}</loc>\n  </sitemap>`).join("\n")}
</sitemapindex>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml",
      // Shard count only changes as the restaurant count crosses a
      // 40,000-row boundary (see RESTAURANTS_PER_SITEMAP) — effectively
      // never day to day — so this can be cached generously.
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
