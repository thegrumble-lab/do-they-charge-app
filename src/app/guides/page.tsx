import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import { guidesIndexSchema } from "@/lib/schema";
import { GUIDES } from "@/content/guides";

export const metadata: Metadata = {
  title: "Guides to UK restaurant service charges",
  description:
    "Plain answers on UK restaurant service charges: whether you have to pay, what the law requires, where the money goes, VAT, and what's typical.",
  alternates: { canonical: "/guides" },
};

export default function GuidesIndexPage() {
  return (
    <div className="page">
      <JsonLd data={guidesIndexSchema(GUIDES)} />
      <div className="breadcrumb">
        <Link href="/">← Discretionary</Link>
      </div>
      <div className="masthead">
        <p className="eyebrow">Guides</p>
        <h1 style={{ fontSize: "clamp(1.8rem, 6vw, 3rem)" }}>
          How service charges work
        </h1>
        <p className="subhead">
          The directory tells you what a particular restaurant does. These
          explain the rest: what you can decline, what you owe, and what
          happens to the money.
        </p>
      </div>

      <main className="ticket">
        <div className="guide-list">
          {GUIDES.map((g) => (
            <Link key={g.slug} className="guide-card" href={`/guides/${g.slug}`}>
              <span className="guide-card-title">{g.h1}</span>
              <span className="guide-card-desc">{g.description}</span>
            </Link>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
