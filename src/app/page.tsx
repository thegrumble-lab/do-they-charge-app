import type { Metadata } from "next";
import Link from "next/link";
import {
  getSampleOfReportedRestaurants,
  searchRestaurants,
  getAreas,
  getRestaurantCount,
} from "@/lib/data";
import SearchDirectory from "@/components/SearchDirectory";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import { homePageSchema } from "@/lib/schema";

// Re-render at most hourly so the "X restaurants across Y areas" summary
// stays reasonably fresh without hitting Supabase on every request. This
// window also decides how often the sampled restaurants below change —
// each regeneration draws a new random handful.
export const revalidate = 3600;

// Every page on this site is reachable on both discretionary.uk and
// www.discretionary.uk — both are configured as live domains in Vercel
// and both return 200 — and until now nothing told Google which was
// authoritative. It indexed a mixture of the two, which split the site's
// signals across two hostnames and, because the Search Console property
// is the URL-prefix https://discretionary.uk/, made every www-indexed
// page invisible there. Canonicals resolve against `metadataBase` (the
// apex, see layout.tsx), so they point at the apex whichever host served
// the request. See HANDOFF.md.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

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
      <JsonLd
        data={homePageSchema({ totalCount, areaCount: areas.length })}
      />
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
        <h2 className="h2">How service charges work</h2>
        <p className="small-print" style={{ marginTop: 0 }}>
          Whether you can decline one, what the law requires a restaurant to
          tell you, and where the money ends up —{" "}
          <Link href="/guides">read the guides</Link>.
        </p>
      </section>

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
