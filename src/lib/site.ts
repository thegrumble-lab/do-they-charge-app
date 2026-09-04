/**
 * The site's canonical public URL. Used anywhere an absolute URL is
 * needed (sitemap, robots.txt, Open Graph tags). Defaults to the real
 * domain (discretionary.uk); NEXT_PUBLIC_SITE_URL is also set explicitly
 * in Vercel's Environment Variables so this stays the single source of
 * truth either way (see HANDOFF.md).
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://discretionary.uk";
