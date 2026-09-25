import { Restaurant } from "./types";

/**
 * A plain maps.google.com link for a restaurant, rendered next to its
 * address. Needs no key, sets no cookies until someone clicks it, and
 * costs nothing.
 *
 * There used to be an actual map here — first a Google Maps Embed iframe,
 * then a mosaic of OpenStreetMap raster tiles built to avoid the consent
 * banner the iframe would have required. Both were removed: the map took
 * up a third of the page and told the reader nothing they couldn't get
 * from the address and a link. HANDOFF.md has the full history, including
 * the embed-mode testing, in case anyone is tempted to bring it back.
 */
export function mapLinkUrl(r: Restaurant): string {
  const q =
    r.lat && r.lng
      ? `${r.lat},${r.lng}`
      : [r.name, r.address, r.postcode].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
