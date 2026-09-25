import { SITE_URL } from "./site";
import { Restaurant, Report, latestReport, hygieneRating } from "./types";
import { placeLabel } from "./location";

/**
 * JSON-LD builders.
 *
 * Deliberately absent: Review and AggregateRating. A service-charge
 * report is not a review and carries no rating — manufacturing a star
 * score out of this data to earn a rich result would misrepresent it, and
 * is exactly what Google's review-snippet policy exists to catch. The
 * site's distinctive fact is expressed honestly instead, as
 * `additionalProperty` on the restaurant.
 *
 * FAQPage is included even though Google stopped rendering FAQ rich
 * results on 7 May 2026 (Search Console reporting removed that June).
 * The markup is inert for Search but costs nothing and remains a clean,
 * explicit statement of the question each page answers — which is the
 * form answer engines parse most readily, and answering that one question
 * is the whole point of the site.
 *
 * Everything here describes only what the page actually shows. Nothing is
 * inferred, padded, or asserted more confidently than the underlying
 * report warrants.
 */

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;

const SITE_NAME = "Discretionary";
const SITE_DESCRIPTION =
  "A UK directory for checking whether a restaurant adds a discretionary service charge, before you book.";

function restaurantUrl(r: Restaurant): string {
  return `${SITE_URL}/${r.areaSlug}/${r.slug}`;
}

/** The question each restaurant page exists to answer. */
export function restaurantQuestion(r: Restaurant): string {
  const place = placeLabel(r.address, r.area, r.name);
  return `Does ${r.name}${place ? ` in ${place}` : ""} add a discretionary service charge?`;
}

/**
 * A plain-English answer built strictly from the latest report, matching
 * what the page displays. Hedged where the data is hedged — an "unclear"
 * report must not read as a confident "no".
 */
export function restaurantAnswer(r: Restaurant): string {
  const place = placeLabel(r.address, r.area, r.name);
  const where = place ? ` in ${place}` : "";
  const latest = latestReport(r);
  if (!latest) {
    return `No one has reported yet on whether ${r.name}${where} adds a discretionary service charge. If you've eaten there recently, you can add what you know.`;
  }

  const pct = latest.pct !== null ? ` of ${latest.pct}%` : "";
  const head: Record<Report["status"], string> = {
    charges: `Yes — ${r.name}${where} adds a discretionary service charge${pct}.`,
    groups: `Only for larger groups — ${r.name}${where} adds a discretionary service charge${pct} to bigger tables.`,
    "no-charge": `No — ${r.name}${where} does not add a discretionary service charge.`,
    unclear: `It isn't clear whether ${r.name}${where} adds a discretionary service charge.`,
  };

  const provenance =
    latest.source === "diner"
      ? `Reported by a diner on ${latest.date}.`
      : latest.source === "researched"
      ? `Checked against the restaurant's own published information on ${latest.date}.`
      : `Starter data, unverified (${latest.date}).`;

  const note = latest.note ? ` ${latest.note}` : "";

  return `${head[latest.status]} ${provenance}${note} Service charges are always optional under UK consumer law — you can ask for it to be removed.`;
}

function chargeProperties(r: Restaurant) {
  const latest = latestReport(r);
  if (!latest) return undefined;

  const label: Record<Report["status"], string> = {
    charges: "Yes",
    groups: "Larger groups only",
    "no-charge": "No",
    unclear: "Unknown",
  };

  const props: Record<string, unknown>[] = [
    {
      "@type": "PropertyValue",
      name: "Adds a discretionary service charge",
      value: label[latest.status],
    },
  ];

  if (latest.pct !== null) {
    props.push({
      "@type": "PropertyValue",
      name: "Discretionary service charge percentage",
      value: latest.pct,
      unitText: "PERCENT",
    });
  }

  props.push({
    "@type": "PropertyValue",
    name: "Service charge information last checked",
    value: latest.date,
  });

  return props;
}

/** Restaurant + breadcrumbs + the question the page answers. */
export function restaurantPageSchema(r: Restaurant): object {
  const url = restaurantUrl(r);

  const restaurant: Record<string, unknown> = {
    "@type": "Restaurant",
    "@id": `${url}#restaurant`,
    name: r.name,
    url,
    // Only what the FSA record actually gives us. The `area` field is the
    // local authority (e.g. "Dacorum"), which is neither the town nor the
    // county, so it is deliberately not mapped to addressLocality or
    // addressRegion — a postcode plus the street line identifies a UK
    // address unambiguously anyway.
    address: {
      "@type": "PostalAddress",
      ...(r.address ? { streetAddress: r.address } : {}),
      ...(r.postcode ? { postalCode: r.postcode } : {}),
      addressCountry: "GB",
    },
  };

  if (r.lat && r.lng) {
    const latitude = Number(r.lat);
    const longitude = Number(r.lng);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      restaurant.geo = { "@type": "GeoCoordinates", latitude, longitude };
    }
  }

  const properties: Record<string, unknown>[] = chargeProperties(r) ?? [];

  // The FSA hygiene rating goes in as a plain PropertyValue, same as the
  // service-charge facts. Deliberately NOT aggregateRating: an inspection
  // score is not a customer review, and Google's review-snippet guidance
  // rules out marking up ratings sourced from elsewhere regardless. This
  // is a statement of fact about the business, not a bid for stars.
  const hygiene = hygieneRating(r);
  if (hygiene) {
    properties.push({
      "@type": "PropertyValue",
      name: "Food hygiene rating",
      value: hygiene.label,
      ...(hygiene.score !== null ? { maxValue: 5, minValue: 0 } : {}),
    });
  }

  if (properties.length > 0) restaurant.additionalProperty = properties;

  return {
    "@context": "https://schema.org",
    "@graph": [
      restaurant,
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumbs`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: SITE_NAME,
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: r.area,
            item: `${SITE_URL}/browse/${r.areaSlug}`,
          },
          // Google's guidance: the final crumb is the current page and
          // needs no `item`.
          { "@type": "ListItem", position: 3, name: r.name },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: restaurantQuestion(r),
            acceptedAnswer: {
              "@type": "Answer",
              text: restaurantAnswer(r),
            },
          },
        ],
      },
    ],
  };
}

/** Organization + WebSite + the directory described as a Dataset. */
export function homePageSchema({
  totalCount,
  areaCount,
}: {
  totalCount: number;
  areaCount: number;
}): object {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "WebSite",
        "@id": SITE_ID,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        inLanguage: "en-GB",
        publisher: { "@id": ORG_ID },
      },
      {
        // The directory itself. Nothing else aggregates UK service-charge
        // policy, so it is worth describing as data rather than only as
        // pages — both for Dataset Search and for anything machine-reading
        // the site.
        "@type": "Dataset",
        "@id": `${SITE_URL}/#dataset`,
        name: "UK restaurant discretionary service charge directory",
        description: `Whether UK restaurants, cafés and pubs add a discretionary service charge, and at what percentage. Covers ${totalCount.toLocaleString(
          "en-GB"
        )} food businesses across ${areaCount} local authority areas, built on the Food Standards Agency food hygiene register and enriched with published service-charge policies and diner reports.`,
        url: SITE_URL,
        inLanguage: "en-GB",
        isAccessibleForFree: true,
        creator: { "@id": ORG_ID },
        spatialCoverage: { "@type": "Place", name: "United Kingdom" },
        variableMeasured: [
          "Discretionary service charge applied",
          "Discretionary service charge percentage",
        ],
        keywords: [
          "service charge",
          "discretionary service charge",
          "restaurants",
          "United Kingdom",
          "tipping",
        ],
      },
    ],
  };
}

/**
 * Breadcrumbs plus a list of the area's restaurants. The list is capped —
 * some areas run to thousands of entries and inlining all of them would
 * bloat the page for no benefit — with `numberOfItems` stating the real
 * total so the sample isn't mistaken for the whole.
 */
export function areaPageSchema({
  area,
  areaSlug,
  restaurants,
  limit = 50,
}: {
  area: string;
  areaSlug: string;
  restaurants: Restaurant[];
  limit?: number;
}): object {
  const url = `${SITE_URL}/browse/${areaSlug}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumbs`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
          { "@type": "ListItem", position: 2, name: area },
        ],
      },
      {
        "@type": "ItemList",
        "@id": `${url}#restaurants`,
        name: `Restaurants in ${area}`,
        numberOfItems: restaurants.length,
        itemListElement: restaurants.slice(0, limit).map((r, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: r.name,
          url: restaurantUrl(r),
        })),
      },
    ],
  };
}
