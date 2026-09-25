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
 * Returns null when no key is configured, so the map simply doesn't
 * render and nothing else about the page changes.
 */

const EMBED_BASE = "https://www.google.com/maps/embed/v1/place";

export function mapEmbedUrl(r: Restaurant): string | null {
  const key = process.env.GOOGLE_MAPS_EMBED_KEY;
  if (!key) return null;

  // Coordinates come straight from the FSA record, so they're exact and
  // can't be mis-resolved. Fall back to a text query only when the feed
  // didn't give us a position.
  let q: string;
  if (r.lat && r.lng && Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lng))) {
    q = `${Number(r.lat)},${Number(r.lng)}`;
  } else {
    // FSA addresses often lead with the business name already, so only
    // prepend it when it isn't there — otherwise the query reads
    // "The Royal Oak, The Royal Oak, 74 Main Road, …".
    const addressLeadsWithName =
      !!r.name &&
      r.address.trim().toLowerCase().startsWith(r.name.trim().toLowerCase());
    const parts = [
      addressLeadsWithName ? "" : r.name,
      r.address,
      r.postcode,
    ].filter(Boolean);
    if (parts.length === 0) return null;
    q = parts.join(", ");
  }

  const params = new URLSearchParams({ key, q, zoom: "16" });
  return `${EMBED_BASE}?${params.toString()}`;
}

/** A plain maps.google.com link, for "open in Google Maps". Needs no key. */
export function mapLinkUrl(r: Restaurant): string {
  const q =
    r.lat && r.lng
      ? `${r.lat},${r.lng}`
      : [r.name, r.address, r.postcode].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
