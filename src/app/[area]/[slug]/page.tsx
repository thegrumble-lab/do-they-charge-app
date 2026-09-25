import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/data";
import { STATUS_META, latestReport } from "@/lib/types";
import AddReportForm from "@/components/AddReportForm";
import ReportErrorForm from "@/components/ReportErrorForm";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import { restaurantPageSchema } from "@/lib/schema";
import { placeLabel } from "@/lib/location";
import { mapEmbedUrl, mapLinkUrl } from "@/lib/maps";
import RestaurantMap from "@/components/RestaurantMap";

// Now that the full 140,921-restaurant dataset is loaded, pages are
// generated on demand instead of all pre-built at deploy time (which would
// make builds impractically slow). The first visit to a given restaurant
// renders it and caches the result; ISR then revalidates that page in the
// background at most every 6 hours, so new diner reports still show up
// without a full redeploy. See the matching comment in
// src/app/browse/[areaSlug]/page.tsx for why this was widened from 1 hour.
export const dynamicParams = true;
export const revalidate = 21600;

type Props = { params: Promise<{ area: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { area, slug } = await params;
  const r = await getRestaurantBySlug(area, slug);
  if (!r) return { title: "Restaurant not found" };
  const latest = latestReport(r);
  // Prefer the town over the local authority: "Long Bennington" locates a
  // pub for a human, "South Kesteven" doesn't. Falls back to no location
  // at all rather than guessing — see src/lib/location.ts.
  const place = placeLabel(r.address, r.area, r.name);
  const where = place ? ` in ${place}` : "";
  const desc = latest
    ? `${r.name}${where}: ${STATUS_META[latest.status].label.toLowerCase()}${
        latest.pct ? ` (around ${latest.pct}%)` : ""
      }, based on ${r.reports.length} report${r.reports.length === 1 ? "" : "s"}.`
    : `No reports yet on whether ${r.name}${where} adds a discretionary service charge — be the first to say.`;
  return {
    title: `Does ${r.name}${where} add a discretionary service charge?`,
    description: desc,
    // Pins the apex as authoritative — these pages also serve on
    // www.discretionary.uk, and Google had indexed a mix of both. See the
    // comment in src/app/page.tsx and HANDOFF.md.
    alternates: { canonical: `/${area}/${slug}` },
  };
}

export default async function RestaurantPage({ params }: Props) {
  const { area, slug } = await params;
  const r = await getRestaurantBySlug(area, slug);
  if (!r) notFound();

  const latest = latestReport(r);
  const meta = latest ? STATUS_META[latest.status] : null;
  const history = r.reports.slice(0, -1).reverse();
  // null when GOOGLE_MAPS_EMBED_KEY isn't set, in which case the page
  // simply renders without a map.
  const embedUrl = mapEmbedUrl(r);

  return (
    <div className="page">
      <JsonLd data={restaurantPageSchema(r)} />
      <div className="breadcrumb">
        <Link href="/">← Discretionary</Link>
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
        {!r.isActive && (
          <p className="small-print" style={{ marginTop: 0, marginBottom: 16 }}>
            This listing is no longer part of the FSA food hygiene register
            (or is outside what this directory currently covers) — the page
            is kept so existing links still work, but it won&apos;t show up
            in search or area listings.
          </p>
        )}
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
                    : latest.source === "researched"
                    ? `Researched — checked ${latest.date}`
                    : `Reported by a diner · ${latest.date}`}
                </span>
              </div>
              {latest.note ? (
                <div className="entry-note">{latest.note}</div>
              ) : null}
              {latest.source === "researched" && latest.sourceUrl ? (
                <p className="small-print" style={{ marginTop: 4 }}>
                  <a href={latest.sourceUrl} target="_blank" rel="noopener noreferrer">
                    Source
                  </a>
                </p>
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
                      {rep.source === "seed"
                        ? "Starter data"
                        : rep.source === "researched"
                        ? "Researched"
                        : "Diner report"}{" "}
                      · {rep.date}
                      {rep.pct ? ` · ${rep.pct}%` : ""}
                    </span>
                    {rep.note ? (
                      <div className="entry-note">{rep.note}</div>
                    ) : null}
                    {rep.source === "researched" && rep.sourceUrl ? (
                      <p className="small-print" style={{ marginTop: 4 }}>
                        <a href={rep.sourceUrl} target="_blank" rel="noopener noreferrer">
                          Source
                        </a>
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {embedUrl && (
          <RestaurantMap
            embedUrl={embedUrl}
            linkUrl={mapLinkUrl(r)}
            name={r.name}
          />
        )}

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
          <ReportErrorForm
            areaSlug={r.areaSlug}
            slug={r.slug}
            hasReport={latest !== null}
          />
        </section>
      </main>

      <p className="small-print" style={{ maxWidth: 720, margin: "16px auto 0" }}>
        FHRS ID {r.fhrsid || "n/a"}
      </p>
      <SiteFooter />
    </div>
  );
}
