import Link from "next/link";
import { getAllRestaurants, getAreas } from "@/lib/data";
import SearchDirectory from "@/components/SearchDirectory";

export default async function HomePage() {
  const restaurants = await getAllRestaurants();
  const areas = await getAreas();

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
        <SearchDirectory restaurants={restaurants} />
      </main>

      <section className="ticket" style={{ marginTop: 24 }}>
        <h2 className="h2">Browse by area</h2>
        <p className="small-print" style={{ marginTop: 0 }}>
          This dev build only carries a sample of {restaurants.length}{" "}
          restaurants across {areas.length} areas — the full national list
          (140,921 restaurants and cafés from the FSA dataset) is ready to
          import once a real database is connected.
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
