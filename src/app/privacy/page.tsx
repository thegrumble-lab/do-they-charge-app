import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Do They Charge? collects, why, and for how long.",
};

export default function PrivacyPage() {
  return (
    <div className="page">
      <div className="breadcrumb">
        <Link href="/">← Do They Charge?</Link>
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
            This site doesn&apos;t have user accounts, doesn&apos;t use
            cookies, and doesn&apos;t run any advertising or tracking
            scripts. Browsing and searching the directory involves no
            personal data at all. The only thing that involves any data
            about you is submitting a diner report.
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
            <a href="mailto:thegrumblephone@gmail.com">
              thegrumblephone@gmail.com
            </a>
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
