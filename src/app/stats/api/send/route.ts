/**
 * Umami analytics, served from our own domain so ad blockers don't drop it.
 * The tracker (/stats/script.js, a rewrite in next.config) posts here, and we pass
 * the visit on to our self-hosted Umami with the visitor's real IP and location:
 * the host only knows those on this side of the hop. Umami reads the IP from
 * CLIENT_IP_HEADER (set to x-site-client-ip) and the location from the cf-* headers.
 * Netlify gives the IP in x-nf-client-connection-ip and the location in x-nf-geo
 * (base64 JSON); the Vercel headers are kept as a fallback.
 * Nothing is stored here and no cookies are set.
 */
const UMAMI_URL = "https://grumble-umami.netlify.app";

type Geo = { city?: string; country?: { code?: string }; subdivision?: { code?: string } };

function netlifyGeo(raw: string | null): Geo | null {
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as Geo;
  } catch {
    try {
      return JSON.parse(raw) as Geo;
    } catch {
      return null;
    }
  }
}

export async function POST(request: Request) {
  const h = request.headers;
  const ip =
    h.get("x-nf-client-connection-ip") ?? (h.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": h.get("user-agent") ?? "",
    "x-site-client-ip": ip,
  };
  const cache = h.get("x-umami-cache");
  if (cache) headers["x-umami-cache"] = cache;

  const geo = netlifyGeo(h.get("x-nf-geo"));
  const country = geo?.country?.code ?? h.get("x-vercel-ip-country");
  if (country) {
    headers["cf-ipcountry"] = country;
    const region = geo?.subdivision?.code ?? h.get("x-vercel-ip-country-region");
    const city = geo?.city ?? h.get("x-vercel-ip-city");
    if (region) headers["cf-region-code"] = region;
    // URL-encoded, matching what Vercel sent (and Hobby Warehouse sends), so city names stay consistent.
    if (city) headers["cf-ipcity"] = geo?.city ? encodeURIComponent(city) : city;
  }
  try {
    const res = await fetch(`${UMAMI_URL}/api/send`, { method: "POST", headers, body: await request.text() });
    return new Response(await res.text(), { status: res.status, headers: { "content-type": res.headers.get("content-type") ?? "application/json" } });
  } catch {
    return new Response(null, { status: 204 });
  }
}
