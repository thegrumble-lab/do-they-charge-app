import { MapMosaic } from "@/lib/maps";

/**
 * The map on a restaurant page: a mosaic of OpenStreetMap-derived raster
 * tiles with our own marker on top.
 *
 * No iframe, no third-party script, no cookies — so it loads with the page
 * and there is nothing to ask consent for. See src/lib/maps.ts for the
 * reasoning and for how the tile grid is worked out.
 *
 * No client-side state either, so this stays a server component and the
 * map is present in the HTML.
 *
 * The attribution below is a licence condition of the tile data. Restyle
 * it if you like; don't remove it.
 */
export default function RestaurantMap({
  mosaic,
  linkUrl,
  name,
}: {
  mosaic: MapMosaic;
  linkUrl: string;
  name: string;
}) {
  return (
    <div className="map-block">
      <div
        className="map-frame"
        role="img"
        aria-label={`Map showing the location of ${name}`}
      >
        <div
          className="map-tiles"
          style={{
            width: mosaic.width,
            height: mosaic.height,
            // Shift the mosaic so the restaurant's exact position lands at
            // the centre of the visible box, whatever the screen width.
            left: `calc(50% - ${mosaic.anchorLeft}px)`,
            top: `calc(50% - ${mosaic.anchorTop}px)`,
          }}
        >
          {mosaic.tiles.map((t) => (
            // Deliberately a plain <img>. next/image would route every
            // tile through Vercel's image optimiser, which bills per
            // transformation — thousands of map tiles is exactly the wrong
            // thing to send through it. These are already the right size.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={t.url}
              src={t.url}
              alt=""
              aria-hidden="true"
              width={256}
              height={256}
              draggable={false}
              style={{ left: t.left, top: t.top }}
            />
          ))}
        </div>
        <span className="map-marker" aria-hidden="true" />
      </div>
      <p className="small-print map-credit">
        <a href={linkUrl} target="_blank" rel="noopener noreferrer">
          Open in Maps
        </a>
        {" · Map data © "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenStreetMap
        </a>
        {" contributors · Tiles © "}
        <a
          href="https://stadiamaps.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Stadia Maps
        </a>
        {", © "}
        <a href="https://stamen.com/" target="_blank" rel="noopener noreferrer">
          Stamen Design
        </a>
        {", © "}
        <a
          href="https://openmaptiles.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenMapTiles
        </a>
      </p>
    </div>
  );
}
