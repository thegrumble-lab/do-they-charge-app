/**
 * The site's canonical public URL. Used anywhere an absolute URL is
 * needed (sitemap, robots.txt, Open Graph tags) — one place to update
 * if/when this moves onto a real domain (see HANDOFF.md, "What's left").
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://do-they-charge-app.vercel.app";
