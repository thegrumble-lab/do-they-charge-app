import type { Metadata } from "next";
import Link from "next/link";
import { isAdmin, adminConfigured } from "@/lib/admin";
import { getOpenFlags } from "@/lib/data";
import AdminLogin from "@/components/AdminLogin";
import AdminPanel from "@/components/AdminPanel";
import SiteFooter from "@/components/SiteFooter";

// Never cached, never prerendered: it's behind a cookie check and shows
// live moderation state.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const authed = await isAdmin();
  const flags = authed ? await getOpenFlags() : [];

  return (
    <div className="page">
      <div className="breadcrumb">
        <Link href="/">← Discretionary</Link>
      </div>

      <div className="masthead">
        <p className="eyebrow">Internal</p>
        <h1 style={{ fontSize: "clamp(1.6rem, 5vw, 2.4rem)" }}>Admin</h1>
        <p className="subhead">
          {authed
            ? "Review flagged entries and correct reports."
            : "Sign in to continue."}
        </p>
      </div>

      <main className="ticket">
        {authed ? (
          <AdminPanel initialFlags={flags} />
        ) : (
          <AdminLogin configured={adminConfigured()} />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
