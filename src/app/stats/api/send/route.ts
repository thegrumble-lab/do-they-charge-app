/**
 * Umami analytics, served from our own domain so ad blockers don't drop it.
 * The tracker (/stats/script.js, a rewrite in next.config) posts here, and we pass
 * the visit on to our self-hosted Umami with the visitor's real IP and location:
 * Vercel only knows those on this side of the hop. Umami reads the IP from
 * CLIENT_IP_HEADER (set to x-site-client-ip) and the location from the cf-* headers.
 * Nothing is stored here and no cookies are set.
 */
const UMAMI_URL = "https://umami-beta-eight.vercel.app";

export async function POST(request: Request) {
  const h = request.headers;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": h.get("user-agent") ?? "",
    "x-site-client-ip": (h.get("x-forwarded-for") ?? "").split(",")[0].trim(),
  };
  const cache = h.get("x-umami-cache");
  if (cache) headers["x-umami-cache"] = cache;
  const country = h.get("x-vercel-ip-country");
  if (country) {
    headers["cf-ipcountry"] = country;
    const region = h.get("x-vercel-ip-country-region");
    const city = h.get("x-vercel-ip-city");
    if (region) headers["cf-region-code"] = region;
    if (city) headers["cf-ipcity"] = city;
  }
  try {
    const res = await fetch(`${UMAMI_URL}/api/send`, { method: "POST", headers, body: await request.text() });
    return new Response(await res.text(), { status: res.status, headers: { "content-type": res.headers.get("content-type") ?? "application/json" } });
  } catch {
    return new Response(null, { status: 204 });
  }
}
