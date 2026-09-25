"use client";

import { useState } from "react";

/**
 * The map on a restaurant page, loaded on click rather than on page load.
 *
 * Two reasons it works this way, both of which matter more than the extra
 * click costs:
 *
 *  1. Consent. A Google Maps iframe sets cookies and hands the visitor's
 *     IP to Google the moment it loads. This site has no cookie banner
 *     and deliberately doesn't want one; under UK PECR that means not
 *     firing third-party embeds until someone asks for it. Click-to-load
 *     keeps the page free of third-party requests for anyone who never
 *     touches the map.
 *  2. Crawlers. Restaurant pages are swept in bulk, and a bot fetching
 *     184,000 pages should not be pulling 184,000 map frames with them.
 *
 * To make the map show immediately instead, render the iframe directly
 * and drop the button — but read the two points above first.
 */
export default function RestaurantMap({
  embedUrl,
  linkUrl,
  name,
}: {
  embedUrl: string;
  linkUrl: string;
  name: string;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div className="map-block">
      {shown ? (
        <iframe
          className="map-frame"
          src={embedUrl}
          title={`Map showing the location of ${name}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className="map-placeholder"
          onClick={() => setShown(true)}
        >
          <span className="map-placeholder-label">Show map</span>
          <span className="small-print">
            Loads Google Maps, which sets its own cookies
          </span>
        </button>
      )}
      <p className="small-print" style={{ marginTop: 6 }}>
        <a href={linkUrl} target="_blank" rel="noopener noreferrer">
          Open in Google Maps
        </a>
      </p>
    </div>
  );
}
