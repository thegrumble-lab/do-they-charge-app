/**
 * Shared slug logic — used by the app (src/lib/data.ts, for diner-added
 * restaurants with no FHRS match) and by scripts/sync-fhrs.mjs (for new
 * restaurants coming in from the FHRS feed). Keeping this in one place
 * means both produce identical slugs for the same input.
 *
 * Only ever called for genuinely NEW restaurants. An existing restaurant's
 * area_slug/slug must never be regenerated — that would break whatever
 * URL is already live/indexed for it.
 */
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-+|-+$)/g, "") || "x"
  );
}
