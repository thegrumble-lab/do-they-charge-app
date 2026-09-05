import { getAreas } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { SITE_URL } from "@/lib/site";
import { RESTAURANTS_PER_SITEMAP, getSitemapShardCount } from "@/lib/sitemap-shards";

// This used to be Next's built-in sitemap.ts + generateSitemaps()
// metadata convention (see git history), which is the normal way to do
// this — but that convention silently reserves /sitemap.xml for itself
// even when generateSitemaps() only ever produces /sitemap/<id>.xml
// (see src/app/sitemap.xml/route.ts's comment for why a real /sitemap.xml
// is needed). The two can't coexist: Next's build fails outright with
// "Conflicting route and metadata at /sitemap.xml" the moment both a
// sitemap.ts metadata file and a route.ts happen to resolve to that path.
// So this is a hand-rolled Route Handler doing exactly what sitemap.ts
// used to, at the same public URLs, freeing /sitemap.xml up for the index.
//
// The [id] segment is matched as e.g. "3.xml" (Next dynamic segments
// match the whole path segment, extension included) so existing/shared
// shard URLs like /sitemap/3.xml keep working unchanged.
export const revalidate = 21600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const shardId = Number(id.replace(/\.xml$/, ""));
  const shardCount = await getSitemapShardCount();

  if (!Number.isInteger(shardId) || shardId < 0 || shardId >= shardCount) {
    return new Response("Not found", { status: 404 });
  }

  const from = shardId * RESTAURANTS_PER_SITEMAP;
  const to = from + RESTAURANTS_PER_SITEMAP - 1;

  type Entry = { url: string; changeFrequency: string; priority: number };
  const entries: Entry[] = [];

  // Static + area pages are few enough to just list once, on the first
  // shard, rather than giving them a shard of their own.
  if (shardId === 0) {
    entries.push(
      { url: SITE_URL, changeFrequency: "daily", priority: 1 },
      { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.4 },
      { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 }
    );
    const areas = await getAreas();
    for (const a of areas) {
      entries.push({
        url: `${SITE_URL}/browse/${a.areaSlug}`,
        changeFrequency: "daily",
        priority: 0.6,
      });
    }
  }

  const { data, error } = await supabase
    .from("restaurants")
    .select("area_slug, slug")
    .eq("is_active", true)
    .order("id")
    .range(from, to);
  if (error) throw error;

  for (const r of data ?? []) {
    entries.push({
      url: `${SITE_URL}/${r.area_slug}/${r.slug}`,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) =>
      `  <url>\n    <loc>${e.url}</loc>\n    <changefreq>${e.changeFrequency}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`
  )
  .join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml" },
  });
}
