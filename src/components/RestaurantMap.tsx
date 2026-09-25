/**
 * The map on a restaurant page.
 *
 * Loads with the page — no click gate. That is a deliberate choice with a
 * cost attached, so it's recorded here:
 *
 *  - Consent. A Google Maps iframe sets cookies and hands the visitor's IP
 *    to Google the moment it loads. This site has no cookie banner and
 *    doesn't want one. Loading the frame for everyone means Google sees
 *    every visitor to a restaurant page. If a banner ever arrives, this is
 *    the component to gate behind it.
 *  - Crawlers. Restaurant pages are swept in bulk. `loading="lazy"` is set
 *    so the frame is fetched only when it comes near the viewport, which
 *    spares bots that never scroll — but it is a hint, not a guarantee.
 *
 * The Embed API itself is free and unmetered, so volume costs nothing; the
 * considerations above are about privacy, not billing.
 *
 * No client-side state, so this stays a server component.
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
  return (
    <div className="map-block">
      <iframe
        className="map-frame"
        src={embedUrl}
        title={`Map showing the location of ${name}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <p className="small-print" style={{ marginTop: 6 }}>
        <a href={linkUrl} target="_blank" rel="noopener noreferrer">
          Open in Google Maps
        </a>
      </p>
    </div>
  );
}
