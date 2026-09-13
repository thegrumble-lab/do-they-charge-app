"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReportFlag } from "@/lib/data";
import { Restaurant, Report, ReportStatus, STATUS_META } from "@/lib/types";

type Draft = {
  reportId: string;
  status: string;
  pct: string;
  note: string;
  date: string;
};

function draftFrom(report: Report): Draft {
  return {
    reportId: report.id,
    status: report.status,
    pct: report.pct === null ? "" : String(report.pct),
    note: report.note ?? "",
    date: report.date,
  };
}

export default function AdminPanel({
  initialFlags,
}: {
  initialFlags: ReportFlag[];
}) {
  const router = useRouter();
  const [flags, setFlags] = useState<ReportFlag[]>(initialFlags);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Restaurant[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  // When an edit was opened from a flag, saving it resolves that flag too.
  const [flagContext, setFlagContext] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function runSearch(q: string) {
    if (!q.trim()) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Search failed.");
      setResults(body.restaurants as Restaurant[]);
      if ((body.restaurants as Restaurant[]).length === 0) {
        setNotice("Nothing matched that.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }

  async function openFlagged(flag: ReportFlag) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(
        `/api/admin/search?areaSlug=${encodeURIComponent(
          flag.areaSlug
        )}&slug=${encodeURIComponent(flag.slug)}`
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Lookup failed.");
      const found = body.restaurants as Restaurant[];
      setResults(found);
      setFlagContext(flag.id);
      setQuery(flag.restaurantName);
      // The report the flag was raised against, falling back to whatever
      // is current if that one has since been superseded.
      const target =
        found[0]?.reports.find((r) => r.id === flag.reportId) ??
        found[0]?.reports[found[0].reports.length - 1];
      if (target) {
        setDraft(draftFrom(target));
      } else {
        setNotice("That listing has no reports to correct.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!draft) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/report", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: draft.reportId,
          status: draft.status,
          pct: draft.pct === "" ? null : Number(draft.pct),
          note: draft.note,
          date: draft.date,
          resolveFlagId: flagContext ?? undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not save that.");
      setNotice("Saved — the public page has been refreshed.");
      if (flagContext) {
        setFlags((f) => f.filter((x) => x.id !== flagContext));
        setFlagContext(null);
      }
      setDraft(null);
      if (query.trim()) await runSearch(query);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that.");
    } finally {
      setBusy(false);
    }
  }

  async function dismissFlag(flagId: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/flag", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not update that.");
      }
      setFlags((f) => f.filter((x) => x.id !== flagId));
      setNotice("Flag dismissed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update that.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.refresh();
  }

  return (
    <>
      {error ? <div className="field-error">{error}</div> : null}
      {notice ? <div className="field-success">{notice}</div> : null}

      <section style={{ marginBottom: 28 }}>
        <h2 className="h2">
          Flagged entries{flags.length ? ` (${flags.length})` : ""}
        </h2>
        {flags.length === 0 ? (
          <p className="small-print">
            Nothing flagged. Visitors can raise these from any restaurant
            page.
          </p>
        ) : (
          <div className="report-history">
            {flags.map((flag) => (
              <div className="report-history-item" key={flag.id}>
                <strong>{flag.restaurantName}</strong>{" "}
                <span className="entry-source">
                  {flag.area} · {flag.createdAt.slice(0, 10)}
                </span>
                <div className="entry-note">{flag.message}</div>
                <p className="small-print" style={{ marginTop: 4 }}>
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => openFlagged(flag)}
                    disabled={busy}
                  >
                    Open entry
                  </button>
                  {" · "}
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => dismissFlag(flag.id)}
                    disabled={busy}
                  >
                    Dismiss
                  </button>
                  {" · "}
                  <a
                    href={`/${flag.areaSlug}/${flag.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View page
                  </a>
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="h2">Find an entry</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFlagContext(null);
            setDraft(null);
            runSearch(query);
          }}
        >
          <div className="field">
            <label htmlFor="admin-q">Name, area or postcode</label>
            <input
              id="admin-q"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. The Kings Arms"
            />
          </div>
          <button type="submit" className="submit-btn" disabled={busy}>
            {busy ? "Working…" : "Search"}
          </button>
        </form>

        {results?.map((r) => (
          <div className="entry" key={r.id}>
            <div className="entry-top">
              <span className="entry-name">{r.name}</span>
              <a
                href={`/${r.areaSlug}/${r.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="small-print"
              >
                View
              </a>
            </div>
            <p className="small-print" style={{ marginTop: 0 }}>
              {r.area}
              {r.postcode ? ` · ${r.postcode}` : ""}
              {r.isActive ? "" : " · inactive listing"}
            </p>

            {r.reports.length === 0 ? (
              <p className="small-print">
                No reports on this listing yet — nothing to edit.
              </p>
            ) : (
              r.reports
                .slice()
                .reverse()
                .map((rep) =>
                  draft?.reportId === rep.id ? (
                    <div key={rep.id} style={{ marginTop: 12 }}>
                      <div className="field">
                        <label htmlFor={`s-${rep.id}`}>Status</label>
                        <select
                          id={`s-${rep.id}`}
                          value={draft.status}
                          onChange={(e) =>
                            setDraft({ ...draft, status: e.target.value })
                          }
                        >
                          {(
                            [
                              "charges",
                              "groups",
                              "no-charge",
                              "unclear",
                            ] as ReportStatus[]
                          ).map((s) => (
                            <option key={s} value={s}>
                              {STATUS_META[s].label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor={`p-${rep.id}`}>Percentage</label>
                        <input
                          id={`p-${rep.id}`}
                          type="number"
                          min={0}
                          max={30}
                          step={0.5}
                          placeholder="blank if not applicable"
                          value={draft.pct}
                          onChange={(e) =>
                            setDraft({ ...draft, pct: e.target.value })
                          }
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`n-${rep.id}`}>Note</label>
                        <textarea
                          id={`n-${rep.id}`}
                          maxLength={220}
                          value={draft.note}
                          onChange={(e) =>
                            setDraft({ ...draft, note: e.target.value })
                          }
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`d-${rep.id}`}>Date</label>
                        <input
                          id={`d-${rep.id}`}
                          type="date"
                          value={draft.date}
                          onChange={(e) =>
                            setDraft({ ...draft, date: e.target.value })
                          }
                        />
                      </div>
                      <button
                        type="button"
                        className="submit-btn"
                        onClick={saveDraft}
                        disabled={busy}
                      >
                        {busy ? "Saving…" : "Save correction"}
                      </button>{" "}
                      <button
                        type="button"
                        className="linkish"
                        onClick={() => {
                          setDraft(null);
                          setFlagContext(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="report-history-item" key={rep.id}>
                      <span className={`stamp ${STATUS_META[rep.status].className}`}>
                        {STATUS_META[rep.status].label}
                      </span>
                      <span className="entry-source">
                        {rep.source} · {rep.date}
                        {rep.pct !== null ? ` · ${rep.pct}%` : ""}
                      </span>
                      {rep.note ? (
                        <div className="entry-note">{rep.note}</div>
                      ) : null}
                      <p className="small-print" style={{ marginTop: 4 }}>
                        <button
                          type="button"
                          className="linkish"
                          onClick={() => {
                            setDraft(draftFrom(rep));
                            setFlagContext(null);
                          }}
                        >
                          Edit
                        </button>
                      </p>
                    </div>
                  )
                )
            )}
          </div>
        ))}
      </section>

      <p className="small-print" style={{ marginTop: 32 }}>
        <button type="button" className="linkish" onClick={signOut}>
          Sign out
        </button>
      </p>
    </>
  );
}
