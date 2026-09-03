import type { MetadataRoute } from "next";
import { getAreas } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { SITE_URL } from "@/lib/site";
import {
  RESTAURANTS_PER_SITEMAP,
  getSitemapShardCount,
} from "@/lib/sitemap-shards";

// With ~184k restaurant pages (see HANDOFF.md), a single sitemap file
// would badly exceed Google's 50,000-URL-per-file limit — so this is
// split into shards via generateSitemaps(), each fetched with the same
// .range() paging pattern used elsewhere in this codebase (see
// getRestaurantsByArea()/getAreas() in src/lib/data.ts) to avoid
// PostgREST's default row cap silently truncating the result.
export async function generateSitemaps() {
  const shards = await getSitemapShardCount();
  return Array.from({ length: shards }, (_, id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const shardId = Number(await id);
  const from = shardId * RESTAURANTS_PER_SITEMAP;
  const to = from + RESTAURANTS_PER_SITEMAP - 1;

  const entries: MetadataRoute.Sitemap = [];

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

  return entries;
}
