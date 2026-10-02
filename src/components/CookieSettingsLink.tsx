"use client";

import { GA_ID, OPEN_EVENT } from "./Analytics";

/** Footer link that reopens the analytics consent banner. Hidden until GA4 is configured. */
export default function CookieSettingsLink() {
  if (!GA_ID) return null;
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
