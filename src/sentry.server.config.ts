import * as Sentry from "@sentry/nextjs";

// Server-side (Node.js runtime) init — see src/instrumentation-client.ts
// for the client-side counterpart and the "inert without a DSN" note.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
