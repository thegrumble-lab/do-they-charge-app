import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import { chainTrackerSchema } from "@/lib/schema";
import { getChainViews, type ChainView } from "@/lib/chain-tracker-data";
import {
  VERDICT_META,
  allChanges,
  formatDate,
  trackerLastChecked,
  type ChainVerdict,
} from "@/content/chain-tracker";
import { SITE_URL } from "@/lib/site";

// Branch counts move as the weekly sync adds new branches; the policies
// themselves change only when the tracker file does (a redeploy).
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Which UK restaurant chains add a service charge? Chain tracker",
  description:
    "Pizza Express, Zizzi, Dishoom, Wagamama and more: which UK restaurant and pub chains add a service charge, at what rate and for which tables, cited from each chain's own site.",
  alternates: { canonical: "/chains" },
};

const SECTIONS: { verdict: ChainVerdict; title: string; intro: string }[] = [
  {
    verdict: "every-bill",
    title: "Added to every bill",
    intro:
      "These chains say on their own site or menu that a service charge goes on the bill as standard. It's discretionary everywhere: you can ask for it to be removed.",
  },
  {
    verdict: "groups",
    title: "Groups only",
    intro:
      "Added only once your party reaches a certain size (and, at a few chains, at London branches too).",
  },
  {
    verdict: "unclear",
    title: "Unclear",
    intro:
      "The chain's own wording stops short of saying whether the charge is added to every bill.",
  },
  {
    verdict: "not-published",
    title: "No published policy",
    intro:
      "We checked each of these chains' own websites, menus and booking terms and found nothing either way. That doesn't mean they never add one; it means they don't say.",
  },
];

function ChainRow({ c }: { c: ChainView }) {
  const meta = VERDICT_META[c.verdict];
  return (
    <div className="entry">
      <div className="entry-top">
        <Link className="entry-name chain-link" href={`/chains/${c.slug}`}>
          {c.chain}
        </Link>
        <span className={`stamp ${meta.className}`}>
          {c.rate ?? meta.label}
        </span>
      </div>
      <div className="entry-note">{c.summary}</div>
      <div className="entry-meta">
        {c.branches ? (
          <span>
            {c.branches} branch{c.branches === 1 ? "" : "es"} listed
          </span>
        ) : null}
        <span>Checked {formatDate(c.checked)}</span>
        {c.changes.length > 0 ? (
          <span>
            {c.changes.length} change{c.changes.length === 1 ? "" : "s"} logged
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default async function ChainTrackerPage() {
  const chains = await getChainViews();
  const lastChecked = trackerLastChecked();
  const changes = allChanges().slice(0, 10);

  const count = (v: ChainVerdict) => chains.filter((c) => c.verdict === v).length;
  const withPolicy = chains.length - count("not-published");
  const branchTotal = chains.reduce((n, c) => n + (c.branches ?? 0), 0);

  return (
    <div className="page">
      <JsonLd data={chainTrackerSchema(chains, lastChecked)} />
      <div className="breadcrumb">
        <Link href="/">← Discretionary</Link>
      </div>

      <div className="masthead">
        <p className="eyebrow">Chain tracker · updated {formatDate(lastChecked)}</p>
        <h1 style={{ fontSize: "clamp(1.9rem, 6.5vw, 3.2rem)" }}>
          Which UK chains add a service charge?
        </h1>
        <p className="subhead">
          {chains.length} UK restaurant and pub chains, checked against their
          own websites, menus and booking terms. Every policy links to the
          page it came from, and we re-check them every month.
        </p>
      </div>

      <section className="ticket">
        <div className="tracker-stats">
          <div className="tracker-stat">
            <span className="tracker-stat-n">{count("every-bill")}</span>
            <span className="tracker-stat-label">add one to every bill</span>
          </div>
          <div className="tracker-stat">
            <span className="tracker-stat-n">{count("groups")}</span>
            <span className="tracker-stat-label">add one for groups</span>
          </div>
          <div className="tracker-stat">
            <span className="tracker-stat-n">{count("not-published")}</span>
            <span className="tracker-stat-label">publish no policy at all</span>
          </div>
          <div className="tracker-stat">
            <span className="tracker-stat-n">
              {branchTotal > 0 ? branchTotal.toLocaleString("en-GB") : withPolicy}
            </span>
            <span className="tracker-stat-label">
              {branchTotal > 0 ? "branches covered" : "publish a policy"}
            </span>
          </div>
        </div>
      </section>

      {SECTIONS.map((s) => {
        const rows = chains
          .filter((c) => c.verdict === s.verdict)
          .sort((a, b) => (b.branches ?? 0) - (a.branches ?? 0) || a.chain.localeCompare(b.chain));
        if (rows.length === 0) return null;
        return (
          <section key={s.verdict} className="ticket" style={{ marginTop: 24 }}>
            <h2 className="h2">{s.title}</h2>
            <p className="small-print" style={{ marginTop: 0 }}>
              {s.intro}
            </p>
            {rows.map((c) => (
              <ChainRow key={c.slug} c={c} />
            ))}
          </section>
        );
      })}

      <section className="ticket" style={{ marginTop: 24 }}>
        <h2 className="h2">Recent changes</h2>
        {changes.length === 0 ? (
          <p className="small-print" style={{ marginTop: 0 }}>
            Tracking began in September 2026. When a chain introduces a
            charge, changes its rate or moves its group threshold, the change
            appears here with the date we spotted it.
          </p>
        ) : (
          changes.map((ch) => (
            <div className="entry" key={`${ch.slug}-${ch.date}-${ch.text}`}>
              <div className="entry-top">
                <Link className="entry-name chain-link" href={`/chains/${ch.slug}`}>
                  {ch.chain}
                </Link>
                <span className="entry-source">{formatDate(ch.date)}</span>
              </div>
              <div className="entry-note">{ch.text}</div>
            </div>
          ))
        )}
      </section>

      <section className="ticket" style={{ marginTop: 24 }}>
        <h2 className="h2">How this is compiled</h2>
        <p className="small-print" style={{ marginTop: 0 }}>
          A chain only counts as having a policy when its own website, menu,
          FAQ or booking terms says so. Tipping and tronc pages (&ldquo;100%
          of tips go to our teams&rdquo;) don&apos;t say whether a charge is
          added, so they don&apos;t count. Where a chain&apos;s own sources
          contradict each other, we say so rather than pick one. Branch counts
          are the chain&apos;s restaurants listed on Discretionary that carry
          this policy; individual branches can differ, and a diner report on a
          branch always takes precedence.
        </p>
        <p className="small-print">
          Spotted a change, or a chain we should add? Email{" "}
          <a href="mailto:hello@discretionary.uk">hello@discretionary.uk</a>.
        </p>
        <div className="cite-box">
          <p className="entry-source" style={{ margin: "0 0 6px" }}>
            Using this data
          </p>
          <p style={{ margin: 0 }}>
            Free to quote with a link. Cite as: Discretionary, UK restaurant
            chain service charge tracker, {SITE_URL.replace("https://", "")}
            /chains, updated {formatDate(lastChecked)}.{" "}
            <a href="/chains/data.csv">Download the full list as CSV</a>.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
