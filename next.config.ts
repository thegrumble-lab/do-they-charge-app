import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
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
