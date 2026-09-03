"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Catches errors that escape every other error boundary (including ones
// thrown by the root layout itself) and reports them to Sentry. This is
// deliberately plain — it renders in place of the whole app, including
// globals.css, so it can't lean on the site's usual styling.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: "60px 20px",
          textAlign: "center",
        }}
      >
        <h1>Something went wrong</h1>
        <p>
          Sorry about that — it&apos;s been reported. Try refreshing, or head
          back to the{" "}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages --
              this replaces the root layout, including its router context,
              so a plain reload-safe <a> is more reliable here than <Link>. */}
          <a href="/">homepage</a>.
        </p>
      </body>
    </html>
  );
}
