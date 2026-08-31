"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Restaurant, STATUS_META, ReportStatus, latestReport } from "@/lib/types";

const FILTERS: { key: "all" | ReportStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "no-charge", label: "No charge" },
  { key: "charges", label: "Adds charge" },
  { key: "groups", label: "Groups only" },
  { key: "unclear", label: "Unclear" },
];

export default function SearchDirectory({
  restaurants,
}: {
  restaurants: Restaurant[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ReportStatus>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return restaurants
      .filter((r) => {
        const latest = latestReport(r);
        const statusOk = status === "all" || latest?.status === status;
        const qOk =
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.area.toLowerCase().includes(q) ||
          r.postcode.toLowerCase().includes(q);
        return statusOk && qOk;
      })
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 100);
  }, [restaurants, query, status]);

  return (
    <div>
      <div className="controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search by restaurant, area or postcode…"
          aria-label="Search restaurants"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="chips" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className="chip"
              data-active={status === f.key}
              onClick={() => setStatus(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <p className="count-line">
        Showing {Math.min(filtered.length, 100)} of {restaurants.length}
        {filtered.length > 100 ? " (refine your search to see more)" : ""}
      </p>
      {filtered.length === 0 ? (
        <div className="empty-state">
          No matches. Not listed yet? Search on its own page once you visit
          it directly, or check back as more reports come in.
        </div>
      ) : (
        filtered.map((r) => {
          const latest = latestReport(r);
          const meta = latest ? STATUS_META[latest.status] : null;
          return (
            <div className="entry" key={`${r.areaSlug}/${r.slug}`}>
              <Link
                className="entry-link"
                href={`/${r.areaSlug}/${r.slug}`}
              >
                <div className="entry-top">
                  <span>
                    <span className="entry-name">{r.name}</span>
                    <span className="entry-area">{r.area}</span>
                  </span>
                  {meta ? (
                    <span className={`stamp ${meta.className}`}>
                      {meta.label}
                    </span>
                  ) : (
                    <span className="stamp unclear">No reports yet</span>
                  )}
                </div>
              </Link>
            </div>
          );
        })
      )}
    </div>
  );
}
