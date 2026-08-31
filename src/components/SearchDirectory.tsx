"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Restaurant, STATUS_META, ReportStatus, latestReport } from "@/lib/types";

const FILTERS: { key: "all" | ReportStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "no-charge", label: "No charge" },
  { key: "charges", label: "Adds charge" },
  { key: "groups", label: "Groups only" },
  { key: "unclear", label: "Unclear" },
];

const DEBOUNCE_MS = 250;

export default function SearchDirectory({
  initialRestaurants,
  totalCount,
}: {
  initialRestaurants: Restaurant[];
  totalCount: number;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ReportStatus>("all");
  // Tags each fetched batch with the query/status it answers, so "loading"
  // and "results" can be derived by comparing against the current
  // query/status instead of needing a separate effect-driven reset.
  const [fetched, setFetched] = useState<{
    query: string;
    status: string;
    restaurants: Restaurant[];
  } | null>(null);
  const requestId = useRef(0);
  const trimmedQuery = query.trim();
  const isFiltering = trimmedQuery !== "" || status !== "all";

  useEffect(() => {
    if (!isFiltering) return;

    const thisRequest = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (trimmedQuery) params.set("q", trimmedQuery);
        params.set("status", status);
        const res = await fetch(`/api/search?${params.toString()}`);
        const body = await res.json().catch(() => null);
        // Ignore stale responses if the user kept typing.
        if (thisRequest === requestId.current) {
          setFetched({
            query: trimmedQuery,
            status,
            restaurants: res.ok && body?.restaurants ? body.restaurants : [],
          });
        }
      } catch {
        if (thisRequest === requestId.current) {
          setFetched({ query: trimmedQuery, status, restaurants: [] });
        }
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [trimmedQuery, status, isFiltering]);

  const fetchedIsCurrent =
    fetched !== null && fetched.query === trimmedQuery && fetched.status === status;
  const loading = isFiltering && !fetchedIsCurrent;
  const results = isFiltering
    ? fetchedIsCurrent
      ? fetched!.restaurants
      : []
    : initialRestaurants;
  const shown = results.slice(0, 100);

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
        {loading
          ? "Searching…"
          : `Showing ${shown.length} of ${totalCount.toLocaleString()} restaurants${
              results.length > 100 ? " (refine your search to see more)" : ""
            }`}
      </p>
      {!loading && shown.length === 0 ? (
        <div className="empty-state">
          No matches. Not listed yet? Search on its own page once you visit
          it directly, or check back as more reports come in.
        </div>
      ) : (
        shown.map((r) => {
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
