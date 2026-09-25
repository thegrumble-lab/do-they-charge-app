import Link from "next/link";
import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-much-is-a-service-charge",
  title: "How much is a service charge in a UK restaurant?",
  h1: "How much is it, usually?",
  description:
    "12.5% is the figure you'll meet most often in London, with 15% appearing at some venues. There is no official statistic and no legal rate — here's what's actually known.",
  updated: "2026-09-25",
  standfirst:
    "12.5% is the number you'll meet most often, and some London restaurants have moved to 15%. What's striking is how little hard data exists: no law sets a rate, and no government body publishes a figure for what restaurants actually charge.",
  faqs: [
    {
      q: "What is the usual service charge in a UK restaurant?",
      a: "12.5% is the most commonly cited figure. VisitLondon, London's official visitor site, tells visitors that restaurants often add a service charge, usually 12.5%, especially for large groups. Some London venues now apply 15%. There is no official statistic covering the UK as a whole.",
    },
    {
      q: "Is there a legal maximum service charge?",
      a: "No. No law sets or caps the rate. A restaurant can choose any percentage, provided it discloses it clearly and in time.",
    },
    {
      q: "What is the service charge calculated on?",
      a: "Usually the food and drink total as it appears on the bill, which for consumers is normally VAT-inclusive. If the charge doesn't come to the percentage stated, the likelier explanations are a separate cover charge, a per-head minimum, or a mistake.",
    },
  ],
  body: (
    <>
      <h2 className="h2">The short answer</h2>
      <p>
        12.5%. It is the figure on most London bills that carry a charge at
        all, and{" "}
        <a
          href="https://www.visitlondon.com/traveller-information/essential-information/money/tipping"
          target="_blank"
          rel="noopener noreferrer"
        >
          VisitLondon
        </a>{" "}
        — London&apos;s official visitor site, published by the promotional
        agency London &amp; Partners — tells visitors that restaurants often
        add a service charge, usually 12.5%,{" "}
        <em>especially if you&apos;re in a large group</em>. That is visitor
        guidance rather than a measurement, but it matches what people
        report.
      </p>
      <p>
        There are signs of movement upward.{" "}
        <a
          href="https://www.timeout.com/london/news/why-are-so-many-london-restaurants-now-charging-a-15-service-charge-031025"
          target="_blank"
          rel="noopener noreferrer"
        >
          Time Out has reported
        </a>{" "}
        a shift toward 15% among London restaurants, in a piece from March
        2025. That is press reporting on a trend rather than a measurement,
        and by now it is also 18 months old.
      </p>

      <h2 className="h2">How little is actually known</h2>
      <p>
        This deserves stating plainly, because a lot of writing on the
        subject implies more certainty than exists. There is no figure for
        typical UK service charges in any legislation, in CMA guidance, in
        HMRC guidance, or in any government publication we could find. The
        government&apos;s own tipping consultations describe a charge often
        suggested as a percentage of the bill, and decline to say what
        percentage.
      </p>
      <p>
        The frequently repeated &ldquo;10% outside London&rdquo; is a case in
        point: widely asserted, and we could not find a credible published
        source for it. It may well be roughly right. It is not something we
        are going to state as fact.
      </p>

      <h2 className="h2">No legal rate, no cap</h2>
      <p>
        Nothing in law sets the percentage or limits it. A restaurant may
        charge 5%, 12.5%, 15% or nothing at all. What it must do is{" "}
        <Link href="/guides/service-charge-law-uk">
          disclose the charge clearly and in time
        </Link>{" "}
        — the rate itself is a commercial decision.
      </p>

      <h2 className="h2">What the percentage is applied to</h2>
      <p>
        Usually the food and drink total as it appears on the bill, which
        for consumers is normally VAT-inclusive — prices shown to consumers
        have to include tax. We haven&apos;t found a source establishing how
        often venues calculate on some other figure, so we aren&apos;t going
        to assert that they do. If the charge doesn&apos;t come to the
        percentage stated, the likelier explanations are a separate cover
        charge, a per-head minimum, or an arithmetic error — all of them
        fair to ask about.
      </p>
      <p>
        Note also that a discretionary charge and a mandatory one are treated
        differently for VAT in the first place —{" "}
        <Link href="/guides/vat-on-service-charge">that has its own page</Link>.
      </p>

      <h2 className="h2">Filling the gap</h2>
      <p>
        The absence of decent data here is, more or less, why this site
        exists. Every entry in the directory records what a specific
        restaurant does, sourced either from a diner&apos;s report or from
        the restaurant&apos;s own published policy. One bill at a time is a
        slow way to build a picture of the country — but it produces a real
        answer for a real restaurant, which no national average ever does.
      </p>
      <p>
        <Link href="/">Look up where you&apos;re going</Link>, or add what
        was on your last bill.
      </p>
    </>
  ),
};
