"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * Google Analytics 4, loaded only after a visitor accepts.
 *
 * UK PECR requires consent before setting non-essential cookies, and GA4
 * sets _ga cookies. So nothing from Google is requested until the visitor
 * clicks Accept: no gtag.js, no cookieless pings, nothing. Declining (or
 * ignoring the banner) means the site behaves exactly as it did before GA4
 * was added.
 *
 * Entirely inert until NEXT_PUBLIC_GA_MEASUREMENT_ID is set (Vercel →
 * Project → Settings → Environment Variables): no ID, no banner.
 *
 * The visitor's choice is kept in localStorage (not a cookie). A
 * "Cookie settings" link in the footer dispatches OPEN_EVENT to reopen
 * the banner so consent can be withdrawn at any time.
 *
 * Page views on client-side navigation are picked up by GA4's enhanced
 * measurement ("page changes based on browser history events", on by
 * default), so no manual page_view events are sent here.
 */

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const STORAGE_KEY = "discretionary-analytics-consent";
export const OPEN_EVENT = "discretionary:open-cookie-settings";
const CHANGE_EVENT = "discretionary:consent-changed";

/** null = not asked yet; "unknown" = server render, before storage can be read. */
type Consent = "granted" | "denied" | null | "unknown";

function readConsent(): Consent {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : memoryConsent;
  } catch {
    return memoryConsent;
  }
}

// Fallback for when localStorage is blocked, so a choice still sticks for this page view.
let memoryConsent: Consent = null;

function writeConsent(v: "granted" | "denied") {
  memoryConsent = v;
  try {
    window.localStorage.setItem(STORAGE_KEY, v);
  } catch {
    // Private mode / blocked storage: the choice just won't persist.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Remove GA's cookies on this domain and its parent (GA sets them on .discretionary.uk). */
function clearGaCookies() {
  const host = window.location.hostname;
  const domains = ["", host, `.${host}`, `.${host.replace(/^www\./, "")}`];
  for (const c of document.cookie.split(";")) {
    const name = c.split("=")[0].trim();
    if (name === "_ga" || name.startsWith("_ga_")) {
      for (const d of domains) {
        document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ""}`;
      }
    }
  }
}

export default function Analytics() {
  const consent = useSyncExternalStore<Consent>(
    subscribe,
    readConsent,
    () => "unknown",
  );
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const reopen = () => setReopened(true);
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  if (!GA_ID || consent === "unknown") return null;
  const open = consent === null || reopened;

  const accept = () => {
    writeConsent("granted");
    setReopened(false);
  };

  const decline = () => {
    const wasGranted = consent === "granted";
    writeConsent("denied");
    setReopened(false);
    if (wasGranted) {
      // gtag.js is already running in this page; a reload is the only
      // clean way to stop it.
      clearGaCookies();
      window.location.reload();
    }
  };

  return (
    <>
      {consent === "granted" && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
          </Script>
        </>
      )}

      {open && (
        <div
          className="consent-banner"
          role="dialog"
          aria-live="polite"
          aria-label="Cookie consent"
        >
          <p>
            Can we use Google Analytics cookies to see how people use the
            site? ItIt&apos;s anonymous visit stats only, no ads.apos;s visit statistics only, never ads.{" "}
            <Link href="/privacy#analytics">More detail</Link>.
          </p>
          <div className="consent-actions">
            <button type="button" className="submit-btn" onClick={accept}>
              Accept
            </button>
            <button type="button" className="submit-btn" onClick={decline}>
              Decline
            </button>
          </div>
        </div>
      )}
    </>
  );
}
