import Link from "next/link";
import { Restaurant, STATUS_META, latestReport } from "@/lib/types";

function locationLabel(r: Restaurant): string {
  return [r.area, r.postcode].filter(Boolean).join(", ");
}

/**
 * Shared three-column listing table (Restaurant / Location / Status) used
 * by both the homepage search results and the per-area browse pages, so
 * the two stay visually consistent.
 */
export default function RestaurantsTable({
  restaurants,
}: {
  restaurants: Restaurant[];
}) {
  return (
    <div className="table-scroll">
      <table className="listing-table">
        <thead>
          <tr>
            <th scope="col">Restaurant</th>
            <th scope="col">Location</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {restaurants.map((r) => {
            const latest = latestReport(r);
            const meta = latest ? STATUS_META[latest.status] : null;
            return (
              <tr key={`${r.areaSlug}/${r.slug}`}>
                <td className="col-name">
                  <Link href={`/${r.areaSlug}/${r.slug}`} title={r.name}>
                    {r.name}
                  </Link>
                </td>
                <td className="col-location" title={locationLabel(r)}>
                  {locationLabel(r)}
                </td>
                <td className="col-status">
                  {meta ? (
                    <span className={`stamp ${meta.className}`}>
                      {meta.label}
                    </span>
                  ) : (
                    <span className="stamp unclear">No reports yet</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
