import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Do They Charge? — UK restaurant service charge directory",
    template: "%s — Do They Charge?",
  },
  description:
    "A crowdsourced UK directory for checking whether a restaurant adds a default service charge, before you book.",
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
