import Link from "next/link";
import {
  getSampleOfReportedRestaurants,
  searchRestaurants,
  getAreas,
  getRestaurantCount,
} from "@/lib/data";
import SearchDirectory from "@/components/SearchDirectory";
import SiteFooter from "@/components/SiteFooter";

// Re-render at most hourly so the "X restaurants across Y areas" summary
// stays reasonably fresh without hitting Supabase on every request. This
// window also decides how often the sampled restaurants below change —
// each regeneration draws a new random handful.
export const revalidate = 3600;

export default async function HomePage() {
  const [sample, areas, totalCount] = await Promise.all([
    getSampleOfReportedRestaurants(),
    getAreas(),
    getRestaurantCount(),
  ]);

  // Fall back to the old alphabetical listing if nothing has a report yet
  // — only really reachable on an empty database, but better than a
  // homepage with an empty table on it.
  const initialRestaurants =
    sample.length > 0 ? sample : await searchRestaurants("", "all");
  const showingSample = sample.length > 0;

  return (
    <div className="page">
      <div className="masthead">
        <p className="eyebrow">A crowdsourced UK directory</p>
        <p className="tagline-buildup">
          They don&apos;t have to add service charges.
          <br />
          You don&apos;t have to eat there.
          <br />
          It&apos;s all&hellip;
        </p>
        <h1>Discretionary.</h1>
        <p className="subhead">
          Check whether a UK restaurant adds a discretionary service charge —
          before you book, not after you&apos;re already sat down.
        </p>
      </div>

      <main className="ticket">
        <SearchDirectory
          initialRestaurants={initialRestaurants}
          totalCount={totalCount}
          showingSample={showingSample}
        />
      </main>

      <section className="ticket" style={{ marginTop: 24 }}>
        <h2 className="h2">Browse by area</h2>
        <p className="small-print" style={{ marginTop: 0 }}>
          {totalCount.toLocaleString()} restaurants, cafés and pubs across{" "}
          {areas.length} areas, from the FSA food hygiene dataset.
        </p>
        <div className="area-grid">
          {areas.map((a) => (
            <Link
              key={a.areaSlug}
              className="area-card"
              href={`/browse/${a.areaSlug}`}
            >
              <div>{a.area}</div>
              <div className="count">{a.count} listed</div>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
