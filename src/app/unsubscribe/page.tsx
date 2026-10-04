import type { Metadata } from "next";
import Link from "next/link";
import { confirmUnsubscribe } from "./actions";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Unsubscribe({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <div className="page">
      <div className="breadcrumb">
        <Link href="/">← Discretionary</Link>
      </div>
      <main className="ticket">
        <section className="entry" style={{ paddingTop: 0 }}>
          {sp.done ? (
            <>
              <h1 className="h2">You&rsquo;re unsubscribed</h1>
              <p>We won&rsquo;t email you again. Sorry for the interruption.</p>
            </>
          ) : sp.error || !sp.e || !sp.t ? (
            <>
              <h1 className="h2">Link not recognised</h1>
              <p>
                Something&rsquo;s wrong with this unsubscribe link. Reply &ldquo;unsubscribe&rdquo; to our email, or email{" "}
                <a href="mailto:hello@discretionary.uk">hello@discretionary.uk</a>, and we&rsquo;ll remove you.
              </p>
            </>
          ) : (
            <form action={confirmUnsubscribe}>
              <h1 className="h2">Unsubscribe</h1>
              <p>Stop all emails from Discretionary to {sp.e}?</p>
              <input type="hidden" name="e" value={sp.e} />
              <input type="hidden" name="t" value={sp.t} />
              <button type="submit">Unsubscribe</button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
