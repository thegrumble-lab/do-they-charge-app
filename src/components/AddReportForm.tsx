"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AddReportForm({
  areaSlug,
  slug,
  name,
  area,
}: {
  areaSlug: string;
  slug: string;
  name: string;
  area: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string>("");
  const [pct, setPct] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — real users never fill this in
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!status) {
      setError("Pick what happened before submitting.");
      return;
    }
    setError("");
    setSubmitting(true);
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
          pct: pct ? Number(pct) : null,
          note,
          website, // honeypot field — API rejects if non-empty
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not save that just now.");
      }
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save that just now."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <p className="field-success">
        Thanks — your report is in. Refresh to see it reflected above.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Honeypot: hidden from real users via CSS, bots tend to fill every field */}
      <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div className="field">
        <label>What happened?</label>
        <div className="status-options" role="radiogroup" aria-label="Service charge status">
          <label className="status-option">
            <input
              type="radio"
              name="status"
              value="charges"
              checked={status === "charges"}
              onChange={(e) => setStatus(e.target.value)}
            />
            Definitely adds a service charge
          </label>
          <label className="status-option">
            <input
              type="radio"
              name="status"
              value="groups"
              checked={status === "groups"}
              onChange={(e) => setStatus(e.target.value)}
            />
            Only for bigger groups
          </label>
          <label className="status-option">
            <input
              type="radio"
              name="status"
              value="no-charge"
              checked={status === "no-charge"}
              onChange={(e) => setStatus(e.target.value)}
            />
            No service charge
          </label>
          <label className="status-option">
            <input
              type="radio"
              name="status"
              value="unclear"
              checked={status === "unclear"}
              onChange={(e) => setStatus(e.target.value)}
            />
            Not sure — just flagging it
          </label>
        </div>
      </div>

      <div className="field">
        <label htmlFor="f-pct">Percentage, if you know it (optional)</label>
        <input
          type="number"
          id="f-pct"
          min={0}
          max={30}
          step={0.5}
          placeholder="e.g. 12.5"
          value={pct}
          onChange={(e) => setPct(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="f-note">Anything else worth knowing? (optional)</label>
        <textarea
          id="f-note"
          maxLength={220}
          placeholder="e.g. only on tables of 6+, removed it without a fuss when asked…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error ? <div className="field-error">{error}</div> : null}

      <button type="submit" className="submit-btn" disabled={submitting}>
        {submitting ? "Adding…" : "Add to the receipt"}
      </button>
    </form>
  );
}
