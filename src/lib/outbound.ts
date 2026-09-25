import { Restaurant } from "./types";
import { placeLabel } from "./location";

/**
 * Outbound links shown next to a restaurant's address.
 *
 * All three are plain search URLs. Nothing here calls an API, costs
 * anything, sets a cookie before it's clicked, or embeds third-party
 * content in the page — which is deliberate, and the reason the review
 * links are links rather than star ratings.
 *
 * Showing actual review scores was investigated and ruled out: Google
 * permits caching place IDs but not rating values, Tripadvisor's terms
 * forbid "caching, storing or indexing" anything but the location ID, and
 * Yelp caps caching at 24 hours — none of which survives a page cached by
 * ISR. Separately, Google Search's review-snippet guidance says outright
 * not to aggregate ratings from other websites, so there was never an SEO
 * case for it either. HANDOFF.md has the full findings and the costs.
 *
 * There used to be a map here too; HANDOFF.md covers why there isn't now.
 */

/** Where a search should look, in words a search engine will recognise. */
function whereabouts(r: Restaurant): string {
  return placeLabel(r.address, r.area, r.name) || r.postcode || r.area;
}

/**
 * Google Maps, searched by name and full address — NOT by the FSA
 * coordinates, even though we have them.
 *
 * Tested 25 September 2026, and the difference is the whole point of the
 * link. A coordinate query ("51.759831,-0.563405") drops an anonymous pin
 * titled with the degrees-and-minutes and offers "Add a missing place":
 * no business, no hours, no reviews. The same place searched as "The
 * Kings Arms, 147 High Street, HP4 3HL" lands on the business itself,
 * rating and review tab included — which is where someone following this
 * link actually wants to be.
 *
 * Name plus a full address is what makes that reliable. A name and
 * postcode alone can return a short list rather than one place (correct
 * one first, in the cases checked); adding the street line resolved
 * straight to the business every time.
 *
 * Note this is the opposite call to the one the old embedded map needed.
 * An embed that resolves a name to the wrong branch shows a confidently
 * wrong map with no way for the reader to tell. A link hands the reader
 * Google's own result, which they can see and judge — so the richer
 * query wins here and lost there.
 */
export function mapLinkUrl(r: Restaurant): string {
  const q = [r.name, r.address, r.postcode].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Tripadvisor's own search, on the UK site. */
export function tripadvisorUrl(r: Restaurant): string {
  const q = [r.name, whereabouts(r)].filter(Boolean).join(" ");
  return `https://www.tripadvisor.co.uk/Search?q=${encodeURIComponent(q)}`;
}
