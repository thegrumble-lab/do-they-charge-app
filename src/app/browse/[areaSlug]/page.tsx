import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurantsByArea, getAreas } from "@/lib/data";
import RestaurantsTable from "@/components/RestaurantsTable";
import SiteFooter from "@/components/SiteFooter";

// Same reasoning as src/app/[area]/[slug]/page.tsx: with 363 areas across
// 140,921 restaurants, generate area pages on demand and refresh them at
// most hourly instead of pre-building all of them at deploy time.
export const dynamicParams = true;
export const revalidate = 3600;

type Props = { params: Promise<{ areaSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { areaSlug } = await params;
  const areas = await getAreas();
  const area = areas.find((a) => a.areaSlug === areaSlug);
  if (!area) return { title: "Area not found" };
  return {
    title: `Restaurants in ${area.area}`,
    description: `Which restaurants in ${area.area} add a service charge by default? ${area.count} listed so far.`,
  };
}

export default async function AreaPage({ params }: Props) {
  const { areaSlug } = await params;
  const areas = await getAreas();
  const area = areas.find((a) => a.areaSlug === areaSlug);
  if (!area) notFound();

  const restaurants = await getRestaurantsByArea(areaSlug);

  return (
    <div className="page">
      <div className="breadcrumb">
        <Link href="/">← Do They Charge?</Link>
      </div>
      <div className="masthead">
        <p className="eyebrow">Browse by area</p>
        <h1 style={{ fontSize: "clamp(1.8rem, 6vw, 3rem)" }}>{area.area}</h1>
        <p className="subhead">{restaurants.length} restaurants listed.</p>
      </div>
      <main className="ticket">
        <RestaurantsTable restaurants={restaurants} />
      </main>
      <SiteFooter />
    </div>
  );
}
