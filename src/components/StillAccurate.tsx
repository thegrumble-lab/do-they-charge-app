"use client";

import { useState } from "react";
import type { ReportStatus } from "@/lib/types";

const CONFIRM_LABEL: Record<ReportStatus, string> = {
  charges: "Yes, they still add one",
  "no-charge": "Yes, still no service charge",
  groups: "Yes, still only for groups",
  unclear: "Yes, still unclear",
};

/**
 * One-tap freshness check. A confirmation saves an ordinary diner report
 * repeating the current verdict, so the listing gets a fresh date without
 * anyone filling in the full form. "Something's changed" jumps to that form.
 */
export default function StillAccurate({
  areaSlug,
  slug,
  name,
  area,
  status,
  pct,
}: {
  areaSlug: string;
  slug: string;
  name: string;
  area: string;
  status: ReportStatus;
  pct: number | null;
}) {
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function confirm() {
    setState("saving");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaSlug,
          slug,
          name,
          area,
          status,
          pct,
          note: "Confirmed still accurate by a diner.",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not save that just now.");
      }
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that just now.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="field-success still-accurate">
        Thanks, that keeps this listing up to date for the next person.
      </p>
    );
  }

  return (
    <div className="still-accurate">
      <span className="still-accurate-q">Eaten here recently? Is this still right?</span>
      <span className="still-accurate-actions">
        <button type="button" className="linkish" onClick={confirm} disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : CONFIRM_LABEL[status]}
        </button>
        <a href="#add-report">Something&apos;s changed</a>
      </span>
      {state === "error" ? <span className="field-error still-accurate-error">{error}</span> : null}
    </div>
  );
}
