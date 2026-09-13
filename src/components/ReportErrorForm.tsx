"use client";

import { useState } from "react";

/**
 * "Something wrong here?" — lets a visitor flag an entry as incorrect.
 *
 * Deliberately tucked behind a toggle rather than shown open: the primary
 * action on a restaurant page is adding a report, and a permanently
 * visible complaint box competes with it. Flags don't appear publicly;
 * they queue up in /admin.
 */
export default function ReportErrorForm({
  areaSlug,
  slug,
  hasReport,
}: {
  areaSlug: string;
  slug: string;
  hasReport: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setError("Tell us what's wrong and we'll take a look.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaSlug, slug, message, website }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not send that just now.");
      }
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send that just now."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <p className="field-success">
        Thanks — flagged for review. We&apos;ll check it and correct the
        entry if it&apos;s wrong.
      </p>
    );
  }

  if (!open) {
    return (
      <p className="small-print">
        <button type="button" className="linkish" onClick={() => setOpen(true)}>
          {hasReport
            ? "Something wrong with this entry?"
            : "Something wrong with this listing?"}
        </button>
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ marginTop: 12 }}>
      <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
        <label htmlFor="flag-website">Leave this field empty</label>
        <input
          id="flag-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="flag-message">What&apos;s wrong?</label>
        <textarea
          id="flag-message"
          maxLength={500}
          placeholder="e.g. the percentage is out of date — it's 10% now, not 12.5%"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {error ? <div className="field-error">{error}</div> : null}

      <button type="submit" className="submit-btn" disabled={submitting}>
        {submitting ? "Sending…" : "Flag this entry"}
      </button>{" "}
      <button type="button" className="linkish" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </form>
  );
}
