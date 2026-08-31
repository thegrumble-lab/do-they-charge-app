import Link from "next/link";
import { searchRestaurants, getAreas, getRestaurantCount } from "@/lib/data";
import SearchDirectory from "@/components/SearchDirectory";

// Re-render at most hourly so the "X restaurants across Y areas" summary
// and the initial results stay reasonably fresh without hitting Supabase
// on every single request.
export const revalidate = 3600;

export default async function HomePage() {
  const [initialRestaurants, areas, totalCount] = await Promise.all([
    searchRestaurants("", "all"),
    getAreas(),
    getRestaurantCount(),
  ]);

  return (
    <div className="page">
      <div className="masthead">
        <p className="eyebrow">A crowdsourced UK directory</p>
        <h1>Do They Charge?</h1>
        <p className="subhead">
          UK menus don&apos;t have to hide it, but the bill still ambushes you
          at the end. Check before you book — not after you&apos;re already
          sat down.
        </p>
      </div>

      <main className="ticket">
        <SearchDirectory
          initialRestaurants={initialRestaurants}
          totalCount={totalCount}
        />
      </main>

      <section className="ticket" style={{ marginTop: 24 }}>
        <h2 className="h2">Browse by area</h2>
        <p className="small-print" style={{ marginTop: 0 }}>
          {totalCount.toLocaleString()} restaurants and cafés across{" "}
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

      <footer className="site-footer">
        Started by one diner fed up with finding out at the table. Data is
        user-submitted and unverified beyond what&apos;s noted — treat it as
        a starting point, not gospel.
      </footer>
    </div>
  );
}
