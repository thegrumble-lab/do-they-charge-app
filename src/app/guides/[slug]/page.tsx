import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import { guideSchema } from "@/lib/schema";
import { GUIDES, getGuide } from "@/content/guides";

// These are seven hand-written files in the repo, so they can be fully
// static — no database, nothing to revalidate. generateStaticParams gives
// Next the whole set at build time and dynamicParams is off, so an
// unknown slug 404s rather than being rendered on demand.
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: "Guide not found" };
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const others = GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <div className="page">
      <JsonLd data={guideSchema(guide)} />
      <div className="breadcrumb">
        <Link href="/">← Discretionary</Link>
        {" · "}
        <Link href="/guides">Guides</Link>
      </div>

      <div className="masthead">
        <p className="eyebrow">Guides</p>
        <h1 style={{ fontSize: "clamp(1.8rem, 6vw, 3rem)" }}>{guide.h1}</h1>
        <p className="subhead">{guide.standfirst}</p>
      </div>

      <main className="ticket">
        <article className="prose">{guide.body}</article>

        {guide.faqs.length > 0 && (
          <section className="prose" style={{ marginTop: 28 }}>
            <h2 className="h2">Common questions</h2>
            {guide.faqs.map((f) => (
              <div className="faq-item" key={f.q}>
                <h3 className="faq-q">{f.q}</h3>
                <p className="faq-a">{f.a}</p>
              </div>
            ))}
          </section>
        )}

        <p className="small-print" style={{ marginTop: 24 }}>
          Last updated {guide.updated}.
        </p>
      </main>

      <section className="ticket" style={{ marginTop: 24 }}>
        <h2 className="h2">More guides</h2>
        <div className="guide-list">
          {others.map((g) => (
            <Link key={g.slug} className="guide-card" href={`/guides/${g.slug}`}>
              <span className="guide-card-title">{g.h1}</span>
              <span className="guide-card-desc">{g.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
