import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import { getChainView, getChainBranches, type ChainBranch } from "@/lib/chain-tracker-data";
import { TRACKED_CHAINS, VERDICT_META, formatDate } from "@/content/chain-tracker";
import { STATUS_META } from "@/lib/types";
import { SITE_URL } from "@/lib/site";

export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
  return TRACKED_CHAINS.map((c) => ({ slug: c.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getChainView(slug);
  if (!c) return { title: "Chain not found" };
  const description =
    c.verdict === "not-published"
      ? `${c.chain} doesn't publish a service charge policy on its own website, menus or booking terms. Checked ${formatDate(c.checked)}.`
      : `${c.chain}: ${c.summary.charAt(0).toLowerCase()}${c.summary.slice(1)}. From ${c.chain}'s own published policy, checked ${formatDate(c.checked)}.`;
  return {
    title: `Does ${c.chain} add a service charge?`,
    description,
    alternates: { canonical: `/chains/${slug}` },
  };
}

function groupByArea(branches: ChainBranch[]): [string, ChainBranch[]][] {
  const map = new Map<string, ChainBranch[]>();
  for (const b of branches) {
    const list = map.get(b.area) ?? [];
    list.push(b);
    map.set(b.area, list);
  }
  return [...map.entries()];
}

export default async function ChainPage({ params }: Props) {
  const { slug } = await params;
  const c = await getChainView(slug);
  if (!c) notFound();

  const meta = VERDICT_META[c.verdict];
  const branches = c.matcherName && c.sourceUrl ? await getChainBranches(c.sourceUrl) : [];
  const variesByBranch = new Set(branches.map((b) => `${b.status}-${b.pct}`)).size > 1;
  const url = `${SITE_URL}/chains/${c.slug}`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: `Does ${c.chain} add a service charge?`,
            acceptedAnswer: {
              "@type": "Answer",
              text:
                c.verdict === "not-published"
                  ? `${c.chain} doesn't say. Its own website, menus and booking terms make no statement either way (checked ${formatDate(c.checked)}).`
                  : `${c.summary}. ${c.note}`,
            },
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumbs`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Discretionary", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Chain tracker", item: `${SITE_URL}/chains` },
          { "@type": "ListItem", position: 3, name: c.chain, item: url },
        ],
      },
    ],
  };

  return (
    <div className="page">
      <JsonLd data={schema} />
      <div className="breadcrumb">
        <Link href="/">← Discretionary</Link>
        {" · "}
        <Link href="/chains">Chain tracker</Link>
      </div>

      <div className="masthead">
        <p className="eyebrow">Chain tracker</p>
        <h1 style={{ fontSize: "clamp(1.8rem, 6vw, 3rem)" }}>
          Does {c.chain} add a service charge?
        </h1>
      </div>

      <main className="ticket">
        <div className="entry-top">
          <div className="entry-name" style={{ fontSize: "1.15rem" }}>
            {c.summary}
          </div>
          <span className={`stamp ${meta.className}`}>{c.rate ?? meta.label}</span>
        </div>
        <p className="entry-note" style={{ marginTop: 14 }}>
          {c.note}
        </p>
        <div className="entry-meta">
          {c.groupSize ? <span>Applies from {c.groupSize} people</span> : null}
          {c.branches ? (
            <span>
              {c.branches} branch{c.branches === 1 ? "" : "es"} listed
            </span>
          ) : null}
          <span>Checked {formatDate(c.checked)}</span>
        </div>
        {c.sourceUrl ? (
          <p className="small-print">
            Source:{" "}
            <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">
              {c.chain}&apos;s own published policy
            </a>
            . Service charges in the UK are discretionary: you can always ask
            for one to be removed.
          </p>
        ) : (
          <p className="small-print">
            If you&apos;ve been charged one at a {c.chain} branch, you can add
            a report on that branch&apos;s page so other diners know.
          </p>
        )}

        {c.changes.length > 0 ? (
          <>
            <div className="tear">
              <span className="tear-label">Policy history</span>
            </div>
            {c.changes.map((ch) => (
              <div className="entry" key={`${ch.date}-${ch.text}`}>
                <div className="entry-top">
                  <span className="entry-note" style={{ marginTop: 0 }}>
                    {ch.text}
                  </span>
                  <span className="entry-source">{formatDate(ch.date)}</span>
                </div>
              </div>
            ))}
          </>
        ) : null}
      </main>

      {branches.length > 0 ? (
        <section className="ticket" style={{ marginTop: 24 }}>
          <h2 className="h2">
            {c.chain} branches ({branches.length})
          </h2>
          <p className="small-print" style={{ marginTop: 0 }}>
            {variesByBranch
              ? "This chain's policy differs between branches, so each one shows its own."
              : "Each branch page shows this policy, along with any diner reports."}
          </p>
          {groupByArea(branches).map(([area, list]) => (
            <div key={area} className="branch-group">
              <p className="entry-source" style={{ margin: "14px 0 4px" }}>
                {area}
              </p>
              {list.map((b) => (
                <div className="branch-row" key={`${b.areaSlug}/${b.slug}`}>
                  <Link href={`/${b.areaSlug}/${b.slug}`}>{b.name}</Link>
                  <span className="branch-addr">
                    {[b.address, b.postcode].filter(Boolean).join(", ")}
                  </span>
                  {variesByBranch ? (
                    <span className={`stamp ${STATUS_META[b.status].className} stamp-small`}>
                      {b.status === "groups" ? "Groups" : b.status === "charges" ? "Every bill" : STATUS_META[b.status].label}
                      {b.pct ? ` ${b.pct}%` : ""}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </section>
      ) : null}

      <section className="ticket" style={{ marginTop: 24 }}>
        <p className="small-print" style={{ marginTop: 0 }}>
          <Link href="/chains">See every chain we track</Link>, or{" "}
          <Link href="/guides/do-you-have-to-pay-a-service-charge">
            read whether you have to pay a service charge
          </Link>
          .
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}
