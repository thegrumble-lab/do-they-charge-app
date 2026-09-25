import { Restaurant } from "./types";

/**
 * Maps on restaurant pages, without a cookie banner.
 *
 * The site previously used a Google Maps Embed iframe. That loads on
 * click or on render, and either way hands Google the visitor's IP and
 * sets its own cookies — which under UK PECR needs consent, which needs a
 * banner, which this site deliberately doesn't have. So the map is now
 * built here instead: plain OpenStreetMap-derived raster tiles served as
 * `<img>` elements, with our own marker drawn on top.
 *
 * Nothing about that sets a cookie or runs third-party script, so there is
 * nothing to consent to. Tile requests still disclose an IP to the tile
 * host, as any image on any CDN does, but that's a hosting relationship
 * rather than the ad-tech one that triggers the consent rules.
 *
 * It also needs no JavaScript at all: the mosaic is positioned with CSS,
 * so it renders in the HTML and works with scripting off. The trade-off is
 * that it doesn't pan or zoom — the "Open in Maps" link covers that.
 *
 * Tiles come from Stadia Maps. Authentication is by allowlisted domain
 * (Origin/Referer), so unlike the Google key there is no secret in the
 * page source at all. Set MAP_TILE_KEY only for local development, where
 * there's no allowlisted domain to authenticate with.
 *
 * ATTRIBUTION IS A LICENCE CONDITION, not decoration: RestaurantMap.tsx
 * renders it, and it stays whatever else changes.
 */

const TILE_BASE = "https://tiles.stadiamaps.com/tiles";
const TILE_SIZE = 256;

/** Default chosen to suit the site's monochrome paper look. */
const DEFAULT_STYLE = "stamen_toner_lite";

/**
 * Zoom 17 is street level — close enough to see which building, wide
 * enough to place it on a recognisable road.
 */
const ZOOM = 17;

/**
 * How much map has to exist either side of the marker, in CSS pixels.
 * The map sits inside `.ticket` (max-width 720px, up to 34px of padding
 * each side), so it is never wider than ~652px; 360 covers half of that
 * with room to spare. Vertically the box is 260px tall, so 150 covers it.
 * These bounds decide how many tiles get requested, so keep them tight.
 */
const HALF_WIDTH = 360;
const HALF_HEIGHT = 150;

export type MapTile = {
  url: string;
  /** Offset within the mosaic, in CSS pixels. */
  left: number;
  top: number;
};

export type MapMosaic = {
  tiles: MapTile[];
  /** Mosaic dimensions, in CSS pixels. */
  width: number;
  height: number;
  /**
   * Where the restaurant falls inside the mosaic, in CSS pixels. The
   * component shifts the mosaic by this much so the point lands dead
   * centre of the visible box.
   */
  anchorLeft: number;
  anchorTop: number;
};

/** Slippy-map projection: lon/lat to fractional tile coordinates. */
function project(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

function tileUrl(style: string, z: number, x: number, y: number): string {
  // @2x tiles are the same ground area at double the pixel density, so
  // they render crisply on phones while still costing one request each.
  const key = process.env.MAP_TILE_KEY;
  const suffix = key ? `?api_key=${encodeURIComponent(key)}` : "";
  return `${TILE_BASE}/${style}/${z}/${x}/${y}@2x.png${suffix}`;
}

export function mapMosaic(r: Restaurant): MapMosaic | null {
  // Tiles are authenticated by allowlisted domain, so on a deployment
  // whose domain isn't registered with the tile host every request comes
  // back 403 and the page fills with broken images. This flag is the
  // deploy-time statement that an account exists for this domain; unset,
  // pages render without a map exactly as they did before maps existed.
  if (process.env.MAP_TILES_ENABLED !== "1") return null;

  const lat = Number(r.lat);
  const lng = Number(r.lng);
  if (
    !r.lat ||
    !r.lng ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 85 ||
    Math.abs(lng) > 180
  ) {
    // No usable position in the FSA record — the page renders without a
    // map rather than guessing one from the address, which is how the
    // Google version used to end up pinning the wrong branch of a chain.
    return null;
  }

  const style = process.env.MAP_TILE_STYLE || DEFAULT_STYLE;
  const n = 2 ** ZOOM;
  const { x: fx, y: fy } = project(lat, lng, ZOOM);

  // World pixel position of the restaurant at this zoom.
  const px = fx * TILE_SIZE;
  const py = fy * TILE_SIZE;

  // Smallest tile range that still covers HALF_WIDTH/HALF_HEIGHT around
  // it. Typically 3-4 columns by 2 rows, so 6-8 requests per page view.
  const xStart = Math.floor((px - HALF_WIDTH) / TILE_SIZE);
  const xEnd = Math.floor((px + HALF_WIDTH) / TILE_SIZE);
  const yStart = Math.floor((py - HALF_HEIGHT) / TILE_SIZE);
  const yEnd = Math.floor((py + HALF_HEIGHT) / TILE_SIZE);

  const tiles: MapTile[] = [];
  for (let ty = yStart; ty <= yEnd; ty++) {
    // Off the top or bottom of the world: no tile exists. Can't happen for
    // UK data, but a blank cell beats a 404 image if it ever does.
    if (ty < 0 || ty >= n) continue;
    for (let tx = xStart; tx <= xEnd; tx++) {
      // Longitude wraps, so a mosaic spanning the antimeridian still gets
      // real tiles.
      const wrapped = ((tx % n) + n) % n;
      tiles.push({
        url: tileUrl(style, ZOOM, wrapped, ty),
        left: (tx - xStart) * TILE_SIZE,
        top: (ty - yStart) * TILE_SIZE,
      });
    }
  }
  if (tiles.length === 0) return null;

  return {
    tiles,
    width: (xEnd - xStart + 1) * TILE_SIZE,
    height: (yEnd - yStart + 1) * TILE_SIZE,
    anchorLeft: px - xStart * TILE_SIZE,
    anchorTop: py - yStart * TILE_SIZE,
  };
}

/** A plain maps.google.com link, for "open in Maps". Sets nothing until clicked. */
export function mapLinkUrl(r: Restaurant): string {
  const q =
    r.lat && r.lng
      ? `${r.lat},${r.lng}`
      : [r.name, r.address, r.postcode].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
