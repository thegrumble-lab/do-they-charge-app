import { Restaurant } from "./types";

/**
 * Google Maps Embed API URLs.
 *
 * Specifically the *Embed* API — the iframe one — because it is free with
 * unlimited requests and no rate limits, per Google's own usage-and-billing
 * page. The Maps JavaScript API and the Static Maps API are billed per
 * load, which across ~184,000 restaurant pages being swept by crawlers is
 * the kind of thing that produces a four-figure surprise. If anyone ever
 * swaps this for either of those, they need to understand that first.
 *
 * Two modes, and the choice between them was tested rather than assumed:
 *
 *  - `search` with q = the business name and center = the FSA coordinates.
 *    This is what we use whenever the feed gave us a position. It renders a
 *    *labelled* pin for the business, and — the important part — the
 *    viewport is pinned to the FSA coordinates, so a wrong name match can
 *    never drag the map to a different town. Tested at Berkhamsted: a
 *    deliberately wrong query ("Costa Coffee") left the viewport exactly
 *    where it was rather than jumping anywhere.
 *  - `place` with a text query, used only as a fallback when there are no
 *    coordinates. This mode is NOT safe as the primary: "Costa Coffee, 147
 *    Deane Road, Bolton, BL3 5AH" resolved to a different Costa 1.5km away
 *    in the town centre — the brand name beat the address. Without
 *    coordinates there's nothing better available, but with them, `search`
 *    wins.
 *
 * Neither mode gives Street View or reviews inside the iframe; those need
 * the Places or Maps JavaScript APIs, both billed per load.
 *
 * Returns null when no key is configured, so the map simply doesn't
 * render and nothing else about the page changes.
 */

const SEARCH_BASE = "https://www.google.com/maps/embed/v1/search";
const PLACE_BASE = "https://www.google.com/maps/embed/v1/place";

export function mapEmbedUrl(r: Restaurant): string | null {
  const key = process.env.GOOGLE_MAPS_EMBED_KEY;
  if (!key) return null;

  const hasCoords =
    !!r.lat &&
    !!r.lng &&
    Number.isFinite(Number(r.lat)) &&
    Number.isFinite(Number(r.lng));

  if (hasCoords) {
    const center = `${Number(r.lat)},${Number(r.lng)}`;
    const name = r.name?.trim();
    if (name) {
      const params = new URLSearchParams({
        key,
        q: name,
        center,
        zoom: "17",
        region: "GB",
      });
      return `${SEARCH_BASE}?${params.toString()}`;
    }
    // No name to search on — fall back to dropping a pin on the position.
    const params = new URLSearchParams({ key, q: center, zoom: "17" });
    return `${PLACE_BASE}?${params.toString()}`;
  }

  // No coordinates: a text query is all we have. FSA addresses often lead
  // with the business name already, so only prepend it when it isn't there
  // — otherwise the query reads "The Royal Oak, The Royal Oak, 74 Main
  // Road, …".
  const addressLeadsWithName =
    !!r.name &&
    r.address.trim().toLowerCase().startsWith(r.name.trim().toLowerCase());
  const parts = [
    addressLeadsWithName ? "" : r.name,
    r.address,
    r.postcode,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  const params = new URLSearchParams({
    key,
    q: parts.join(", "),
    zoom: "17",
    region: "GB",
  });
  return `${PLACE_BASE}?${params.toString()}`;
}

/** A plain maps.google.com link, for "open in Google Maps". Needs no key. */
export function mapLinkUrl(r: Restaurant): string {
  const q =
    r.lat && r.lng
      ? `${r.lat},${r.lng}`
      : [r.name, r.address, r.postcode].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
