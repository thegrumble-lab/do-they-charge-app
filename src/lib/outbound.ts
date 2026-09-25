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

/** Google Maps, centred on the FSA coordinates when we have them. */
export function mapLinkUrl(r: Restaurant): string {
  const q =
    r.lat && r.lng
      ? `${r.lat},${r.lng}`
      : [r.name, r.address, r.postcode].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/**
 * A Google search rather than a Maps deep link: without a place ID we
 * can't link straight to a business's review panel, and a search for the
 * name and town reliably surfaces it.
 */
export function googleReviewsUrl(r: Restaurant): string {
  const q = [r.name, whereabouts(r), "reviews"].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

/** Tripadvisor's own search, on the UK site. */
export function tripadvisorUrl(r: Restaurant): string {
  const q = [r.name, whereabouts(r)].filter(Boolean).join(" ");
  return `https://www.tripadvisor.co.uk/Search?q=${encodeURIComponent(q)}`;
}
