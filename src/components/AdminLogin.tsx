"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Wrong password.");
      }
      setPassword("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wrong password.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!configured) {
    return (
      <p className="small-print">
        Admin access isn&apos;t configured on this deployment — set an
        <code> ADMIN_PASSWORD</code> environment variable in Vercel and
        redeploy.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="admin-password">Password</label>
        <input
          type="password"
          id="admin-password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error ? <div className="field-error">{error}</div> : null}
      <button type="submit" className="submit-btn" disabled={submitting}>
        {submitting ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
