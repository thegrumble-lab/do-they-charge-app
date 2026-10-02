"use client";

import { OPEN_EVENT } from "./Analytics";

/** Footer link that reopens the analytics consent banner. Hidden until GA4 is configured. */
export default function CookieSettingsLink() {
  if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return null;
  return (
    <>
      {" · "}
      <button
        type="button"
        className="linkish"
        onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      >
        Cookie settings
      </button>
    </>
  );
}
