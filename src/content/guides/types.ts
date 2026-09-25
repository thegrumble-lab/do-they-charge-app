import type { ReactNode } from "react";

/**
 * A guide is a single editorial page under /guides.
 *
 * Deliberately a typed object rather than MDX or a CMS: there are seven
 * of these, they change rarely, and keeping them as TSX means they use
 * the same components and styles as the rest of the site, get type-checked
 * in CI, and can link into the directory without any plumbing.
 *
 * `faqs` is rendered on the page AND emitted as FAQPage structured data.
 * Those two must never diverge — Google's structured data policy requires
 * marked-up content to be visible to the reader — which is why there is
 * one array feeding both rather than a separate block of schema.
 */
export interface Guide {
  slug: string;
  /** Browser title. The site suffix is appended by the layout. */
  title: string;
  h1: string;
  /** Meta description, and the standfirst on the index page. */
  description: string;
  /** ISO date. Shown on the page and used as dateModified. */
  updated: string;
  /** Opening paragraph, above the first heading. */
  standfirst: string;
  body: ReactNode;
  faqs: { q: string; a: string }[];
}
