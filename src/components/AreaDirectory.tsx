"use client";

import { useMemo, useState } from "react";
import { Restaurant, ReportStatus, latestReport } from "@/lib/types";
import RestaurantsTable from "./RestaurantsTable";

const FILTERS: { key: "all" | ReportStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "no-charge", label: "No charge" },
  { key: "charges", label: "Adds charge" },
  { key: "groups", label: "Groups only" },
  { key: "unclear", label: "Unclear" },
];

/** How many recently-reported places to show above the A-Z. */
const LATEST_LIMIT = 10;

/** Cap on rendered search results, matching the homepage's behaviour. */
const RESULTS_LIMIT = 100;

/**
 * The search + listings on an area page.
 *
 * Unlike the homepage's SearchDirectory, this searches **within the area**
 * and does it entirely in the browser — no /api/search round trip, no
 * debounce, no loading state. It can, because the page already ships every
 * restaurant in the area in order to render the A-Z; filtering an array
 * that is already in memory is free, and instant.
 *
 * The trade-off is that a search here will never find somewhere in a
 * different area. That's the intended behaviour on a page about one place,
 * and the placeholder says so. Pointing it at the whole directory instead
 * means calling /api/search the way SearchDirectory does.
 */
export default function AreaDirectory({
  restaurants,
  area,
}: {
  restaurants: Restaurant[];
  area: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ReportStatus>("all");

  const trimmedQuery = query.trim();
  const isFiltering = trimmedQuery !== "" || status !== "all";

  const results = useMemo(() => {
    if (!isFiltering) return [];
    const needle = trimmedQuery.toLowerCase();
    return restaurants.filter((r) => {
      if (status !== "all") {
        const latest = latestReport(r);
        if (!latest || latest.status !== status) return false;
      }
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        r.postcode.toLowerCase().includes(needle) ||
        r.address.toLowerCase().includes(needle)
      );
    });
  }, [restaurants, trimmedQuery, status, isFiltering]);

  /**
   * Most recently reported first. Only places that actually have a report
   * qualify — the vast majority of listings have none, and "latest" has to
   * mean something. Sorted on the report date the page itself displays, so
   * the order always matches what a reader can see.
   */
  const latest = useMemo(() => {
    return restaurants
      .filter((r) => latestReport(r) !== null)
      .sort((a, b) => {
        const byDate = latestReport(b)!.date.localeCompare(latestReport(a)!.date);
        if (byDate !== 0) return byDate;
        // Stable tie-break so the order can't shuffle between renders.
        return a.name.localeCompare(b.name);
      })
      .slice(0, LATEST_LIMIT);
  }, [restaurants]);

  const shown = results.slice(0, RESULTS_LIMIT);

  return (
    <div>
      <div className="controls">
        <input
          type="text"
          className="search-input"
          placeholder={`Search in ${area} by name or postcode…`}
          aria-label={`Search restaurants in ${area}`}
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

      {isFiltering ? (
        <>
          <p className="count-line">
            {`Showing ${shown.length} of ${restaurants.length.toLocaleString()} in ${area}${
              results.length > RESULTS_LIMIT
                ? " (refine your search to see more)"
                : ""
            }`}
          </p>
          {shown.length === 0 ? (
            <div className="empty-state">
              Nothing in {area} matches that. Try a shorter search, or clear
              the filter to see everywhere listed here.
            </div>
          ) : (
            <RestaurantsTable restaurants={shown} />
          )}
        </>
      ) : (
        <>
          {latest.length > 0 && (
            <section className="area-section">
              <h2 className="h2">Latest reports</h2>
              <p className="small-print" style={{ marginTop: 0 }}>
                The most recently reported places in {area}
                {latest.length === LATEST_LIMIT ? ` — newest ${LATEST_LIMIT}` : ""}.
              </p>
              <RestaurantsTable restaurants={latest} />
            </section>
          )}

          <section className="area-section">
            <h2 className="h2">A–Z</h2>
            <p className="small-print" style={{ marginTop: 0 }}>
              Every restaurant, café and pub listed in {area}
              {countWithReports(restaurants) === 0
                ? " — none reported on yet, so be the first."
                : "."}
            </p>
            <RestaurantsTable restaurants={restaurants} />
          </section>
        </>
      )}
    </div>
  );
}

function countWithReports(restaurants: Restaurant[]): number {
  return restaurants.filter((r) => latestReport(r) !== null).length;
}
