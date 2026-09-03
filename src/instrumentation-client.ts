import * as Sentry from "@sentry/nextjs";

// Entirely inert until NEXT_PUBLIC_SENTRY_DSN is set (Vercel → Project →
// Settings → Environment Variables) — Sentry's SDK no-ops without a DSN,
// so this is safe to ship ahead of actually having a Sentry project. See
// HANDOFF.md, "Error monitoring", for what to set and where.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // A low trace sample rate keeps this within Sentry's free tier at this
  // site's traffic — raise it later if you want more performance detail.
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
