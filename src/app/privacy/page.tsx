import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Discretionary collects, why, and for how long.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="page">
      <div className="breadcrumb">
        <Link href="/">← Discretionary</Link>
      </div>
      <div className="masthead">
        <p className="eyebrow">Privacy</p>
        <h1 style={{ fontSize: "clamp(1.8rem, 6vw, 3rem)" }}>
          Privacy policy
        </h1>
      </div>

      <main className="ticket">
        <section className="entry" style={{ paddingTop: 0 }}>
          <h2 className="h2">The short version</h2>
          <p>
            This site doesn&apos;t have user accounts and doesn&apos;t run
            any advertising. If you say yes when asked, it uses Google
            Analytics to count visits; if you say no, no analytics
            cookies are set and browsing the directory involves no
            personal data at all. Submitting a diner report is the only
            other thing that involves any data about you.
          </p>
        </section>

        <section className="entry">
          <h2 className="h2">If you submit a report</h2>
          <p>
            When you add a report on a restaurant&apos;s page (what
            happened, an optional percentage, an optional note), that
            content is stored and published on the site immediately — it
            becomes a public part of that restaurant&apos;s listing, so
            don&apos;t include anything in the note field you wouldn&apos;t
            want public. No name, email, or account is collected or
            required.
          </p>
          <p>
            Your IP address is recorded at submission time, but only to
            enforce a short cooldown that stops the same visitor from
            submitting repeated reports within 30 seconds — it&apos;s
            never shown publicly, published alongside a report, or used
            for anything else, such as figuring out who or where you are.
          </p>
        </section>

        <section className="entry" id="analytics">
          <h2 className="h2">Analytics cookies</h2>
          <p>
            With your permission, the site uses Google Analytics 4 to
            understand how it&apos;s used: which pages people visit, how
            they arrive (for example from a search engine), and roughly
            what device and region they&apos;re browsing from. It sets
            first-party cookies named <code>_ga</code> and{" "}
            <code>_ga_&lt;ID&gt;</code>, which last up to two years. Google
            processes this data on the site&apos;s behalf; it isn&apos;t
            used for advertising and Google signals are switched off.
          </p>
          <p>
            Nothing from Google loads until you click Accept on the
            banner. Your choice is saved in your browser&apos;s local
            storage, not a cookie. You can change your mind at any time
            through the &ldquo;Cookie settings&rdquo; link at the bottom of
            every page; choosing Decline there removes the analytics
            cookies.
          </p>
        </section>

        <section className="entry">
          <h2 className="h2">Hosting</h2>
          <p>
            The site is hosted on Vercel and its database on Supabase.
            Both process standard web request data (like IP addresses) as
            part of running the site — see their own privacy policies for
            how they each handle that.
          </p>
        </section>

        <section className="entry">
          <h2 className="h2">Questions</h2>
          <p>
            <a href="mailto:hello@discretionary.uk">
              hello@discretionary.uk
            </a>
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
