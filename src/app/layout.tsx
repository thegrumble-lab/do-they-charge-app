import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

const TITLE = "Discretionary — UK restaurant service charge checker";
const DESCRIPTION =
  "A crowdsourced UK directory for checking whether a restaurant adds a discretionary service charge, before you book.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s — Discretionary",
  },
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Discretionary",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
