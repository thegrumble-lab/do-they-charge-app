import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

/**
 * Keep Vercel's own hostnames out of search results, so discretionary.uk is
 * the only indexable copy of the site.
 *
 * - The production alias (do-they-charge-app.vercel.app) 308s to the same
 *   path on discretionary.uk, which also hands any links or rankings it
 *   picked up over to the real domain.
 * - Every other *.vercel.app host (per-deployment and preview URLs) still
 *   works for testing but is sent with X-Robots-Tag: noindex.
 *
 * Both run in Vercel's routing layer from next.config, before any function
 * is invoked, so they add no serverless or proxy cost.
 */
const VERCEL_PRODUCTION_ALIAS = "do-they-charge-app.vercel.app";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: VERCEL_PRODUCTION_ALIAS }],
        destination: "https://discretionary.uk/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "(?<host>.*)\\.vercel\\.app" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

// Safe to ship ahead of having a Sentry project: org/project/authToken all
// come from env vars that don't exist yet, and the plugin just skips the
// source-map upload step (with a warning, not a build failure) when
// SENTRY_AUTH_TOKEN is unset — which is the normal case for local/dev
// builds even once Sentry is fully wired up. See HANDOFF.md.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
