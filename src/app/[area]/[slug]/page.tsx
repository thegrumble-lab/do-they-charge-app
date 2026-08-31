import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllRestaurants, getRestaurantBySlug } from "@/lib/data";
import { STATUS_META, latestReport } from "@/lib/types";
import AddReportForm from "@/components/AddReportForm";

// Dev-build note: with only the 520-restaurant sample loaded, it's cheap to
// pre-build every page. Once this is wired to the full 140,921-restaurant
// dataset via a real database, switch to on-demand generation instead of
// enumerating every slug at build time:
//   export const dynamicParams = true;
//   export const revalidate = 3600; // ISR: regenerate at most hourly
// and drop (or shrink) generateStaticParams so the build doesn't try to
// pre-render 140k pages up front.
export async function generateStaticParams() {
  const restaurants = await getAllRestaurants();
  return restaurants.map((r) => ({
    area: r.areaSlug,
    slug: r.slug,
  }));
}

type Props = { params: Promise<{ area: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { area, slug } = await params;
  const r = await getRestaurantBySlug(area, slug);
  if (!r) return { title: "Restaurant not found" };
  const latest = latestReport(r);
  const desc = latest
    ? `${r.name} in ${r.area}: ${STATUS_META[latest.status].label.toLowerCase()}${
        latest.pct ? ` (around ${latest.pct}%)` : ""
      }, based on ${r.reports.length} diner report${r.reports.length === 1 ? "" : "s"}.`
    : `No reports yet on whether ${r.name} in ${r.area} adds a service charge — be the first to say.`;
  return {
    title: `Does ${r.name} add a service charge?`,
    description: desc,
  };
}

export default async function RestaurantPage({ params }: Props) {
  const { area, slug } = await params;
  const r = await getRestaurantBySlug(area, slug);
  if (!r) notFound();

  const latest = latestReport(r);
  const meta = latest ? STATUS_META[latest.status] : null;
  const history = r.reports.slice(0, -1).reverse();

  return (
    <div className="page">
      <div className="breadcrumb">
        <Link href="/">← Do They Charge?</Link>
        {" · "}
        <Link href={`/browse/${r.areaSlug}`}>{r.area}</Link>
      </div>

      <div className="masthead">
        <p className="eyebrow">{r.area}</p>
        <h1 style={{ fontSize: "clamp(1.8rem, 6vw, 3rem)" }}>{r.name}</h1>
        <p className="subhead">
          {r.address ? `${r.address}, ` : ""}
          {r.postcode}
        </p>
      </div>

      <main className="ticket">
        <div className="entry" style={{ paddingTop: 0 }}>
          <div className="entry-top">
            <span className="entry-name">Current status</span>
            {meta ? (
              <span className={`stamp ${meta.className}`}>{meta.label}</span>
            ) : (
              <span className="stamp unclear">No reports yet</span>
            )}
          </div>
          {latest ? (
            <>
              <div className="entry-meta">
                {latest.pct ? <span>{latest.pct}%</span> : null}
                <span className="entry-source">
                  {latest.source === "seed"
                    ? "Starter data — unverified"
                    : `Reported by a diner · ${latest.date}`}
                </span>
              </div>
              {latest.note ? (
                <div className="entry-note">{latest.note}</div>
              ) : null}
            </>
          ) : (
            <p className="small-print" style={{ marginTop: 8 }}>
              This listing exists because it&apos;s a registered food
              business, but nobody&apos;s reported on its service charge
              policy yet. Been here recently? Add what you know below.
            </p>
          )}

          {history.length > 0 && (
            <div className="report-history">
              {history.map((rep) => {
                const m = STATUS_META[rep.status];
                return (
                  <div className="report-history-item" key={rep.id}>
                    <span className={`stamp ${m.className}`}>{m.label}</span>
                    <span className="entry-source">
                      {rep.source === "seed" ? "Starter data" : "Diner report"}{" "}
                      · {rep.date}
                      {rep.pct ? ` · ${rep.pct}%` : ""}
                    </span>
                    {rep.note ? (
                      <div className="entry-note">{rep.note}</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="tear">
          <span className="tear-label">Tear here — add your own</span>
        </div>

        <section className="add-section">
          <h2 className="h2">Add what you know</h2>
          <p className="hint">
            Been to {r.name} recently? A quick report helps the next person
            avoid an awkward moment.
          </p>
          <AddReportForm
            areaSlug={r.areaSlug}
            slug={r.slug}
            name={r.name}
            area={r.area}
          />
          <p className="small-print">
            Service charges are always optional under UK consumer law,
            whatever&apos;s listed here: you can ask for it to be removed.
          </p>
        </section>
      </main>

      <footer className="site-footer">
        FHRS ID {r.fhrsid || "n/a"} · Data is user-submitted and unverified
        beyond what&apos;s noted.
      </footer>
    </div>
  );
}
