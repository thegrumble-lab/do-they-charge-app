import Link from "next/link";

/**
 * Shared across every page. Two things this exists to get right:
 *
 * 1. FSA/Open Government Licence attribution — the underlying restaurant
 *    data (name, address, postcode, business type) comes from the Food
 *    Standards Agency's FHRS dataset, published under the OGL, which
 *    requires acknowledging the source. See HANDOFF.md's "Automated
 *    weekly sync" section for how that data is kept current.
 * 2. Honest framing of what a status means — most reports on this site
 *    are no longer diner-submitted (that was true when this site was
 *    brand new; see the old copy this replaced). The majority now come
 *    from an automated research pipeline that only ever cites a
 *    restaurant's own published policy — see the About page for how
 *    that's done and where it can be wrong.
 */
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>
        Restaurant data (name, address, postcode) from the{" "}
        <a
          href="https://www.food.gov.uk/business-guidance/food-hygiene-rating-scheme-fhrs-technical-guidance"
          target="_blank"
          rel="noopener noreferrer"
        >
          Food Standards Agency
        </a>
        , used under the{" "}
        <a
          href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Government Licence v3.0
        </a>
        . Service-charge statuses are either reported by diners or
        researched and cited from a restaurant&apos;s own published policy —
        see <Link href="/about">how this works</Link>. Spotted something
        wrong? <Link href="/about#correct-a-listing">Let us know</Link>.
      </p>
      <p>
        <Link href="/about">About</Link> · <Link href="/privacy">Privacy</Link>
      </p>
    </footer>
  );
}
