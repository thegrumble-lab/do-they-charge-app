import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "About",
  description:
    "How Discretionary sources its data, how statuses are researched and cited, and how to flag a correction.",
};

export default function AboutPage() {
  return (
    <div className="page">
      <div className="breadcrumb">
        <Link href="/">← Discretionary</Link>
      </div>
      <div className="masthead">
        <p className="eyebrow">About</p>
        <h1 style={{ fontSize: "clamp(1.8rem, 6vw, 3rem)" }}>
          What this site is and how it works
        </h1>
      </div>

      <main className="ticket">
        <section className="entry" style={{ paddingTop: 0 }}>
          <h2 className="h2">Why this exists</h2>
          <p>
            Started by one diner fed up with finding out about a
            discretionary service charge at the table, after the bill was
            already in front of them. UK menus don&apos;t have to disclose it
            in advance, so this site tries to fill that gap: a quick way to
            check before you book, not after you&apos;re sat down.
          </p>
        </section>

        <section className="entry">
          <h2 className="h2">Where the restaurant list comes from</h2>
          <p>
            Every restaurant, café and pub listed here comes from the{" "}
            <a
              href="https://www.food.gov.uk/business-guidance/food-hygiene-rating-scheme-fhrs-technical-guidance"
              target="_blank"
              rel="noopener noreferrer"
            >
              Food Standards Agency&apos;s
            </a>{" "}
            national food hygiene register, published under the{" "}
            <a
              href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Government Licence v3.0
            </a>
            . It&apos;s kept in sync automatically, so new registrations
            appear and closed businesses are marked as no longer listed
            (never deleted outright, so links people have already shared
            keep working). The FSA register has no concept of service
            charges — that part is entirely this site&apos;s own research
            and diner reports, described below.
          </p>
        </section>

        <section className="entry">
          <h2 className="h2">Where a &ldquo;status&rdquo; comes from</h2>
          <p>A listing&apos;s service-charge status comes from one of two places, and the page always says which:</p>
          <p>
            <strong>Reported by a diner</strong> — someone who&apos;s actually
            been submitted what they saw on their bill. These are
            unverified beyond basic spam checks; take them as one
            person&apos;s recent experience, not a guarantee.
          </p>
          <p>
            <strong>Researched</strong> — checked against a restaurant&apos;s
            own published policy (a FAQ, menu, booking terms, or similar),
            with a link to that source shown on the page. Nothing is ever
            guessed: if no restaurant ever publishes a policy anywhere
            findable, or its wording covering conflicting, it&apos;s
            recorded as &ldquo;unclear&rdquo; with a note, rather than
            assigning a status that can&apos;t be backed by a link.
          </p>
          <p>
            Either way, service charges are always optional under UK
            consumer law — whatever a listing says, you can ask for it to
            be removed at the table.
          </p>
        </section>

        <section className="entry" id="correct-a-listing">
          <h2 className="h2">Spotted something wrong?</h2>
          <p>
            If a listing about your business or a business you know is
            wrong, out of date, or shouldn&apos;t be findable via a
            particular search term, get in touch and it&apos;ll be looked
            at and corrected promptly:{" "}
            <a href="mailto:hello@discretionary.uk">
              hello@discretionary.uk
            </a>
            . Please include the restaurant&apos;s name and area (or a link
            to its page) and what&apos;s wrong.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
