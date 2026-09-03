import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Reports server-side errors (Server Components, Route Handlers, Server
// Actions) that Next.js's own error boundaries catch — the client-side
// equivalent (React render errors) is handled by app/global-error.tsx.
export const onRequestError = Sentry.captureRequestError;
