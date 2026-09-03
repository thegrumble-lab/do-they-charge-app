import * as Sentry from "@sentry/nextjs";

// Edge-runtime init — identical to sentry.server.config.ts, kept separate
// because the Node and Edge runtimes are instrumented independently. See
// src/instrumentation-client.ts for the "inert without a DSN" note.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
