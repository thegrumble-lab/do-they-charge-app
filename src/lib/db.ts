import { Pool } from "pg";

/**
 * Direct Postgres connection, bypassing Supabase's PostgREST/API layer.
 *
 * Used by the two places where PostgREST is the wrong tool:
 *
 *  1. searchRestaurants()'s ranked-search path (src/lib/data.ts).
 *     PostgREST's request-handling layer adds a consistent ~3-5s delay to
 *     the search_restaurants_ranked() RPC that isn't present on simple
 *     table selects and isn't inside Postgres's own query execution
 *     (confirmed via pg_stat_activity showing the connection idle during
 *     the "slow" window, and via EXPLAIN ANALYZE showing the query itself
 *     runs in 100-300ms). Going direct took searches from ~4s to ~0.5s.
 *
 *  2. The sitemap shards (src/app/sitemap/[id]/route.ts). PostgREST caps
 *     every response at 1,000 rows regardless of the range requested, so
 *     each shard was silently emitting 1,000 of its 40,000 URLs — about
 *     3% of the site. A direct query has no such cap.
 *
 * See HANDOFF.md for the full diagnosis behind both.
 *
 * Everything else in the app still goes through the anon-key supabase-js
 * client in supabase.ts, which is fast and has the RLS guarantees the
 * public site relies on.
 *
 * Configured from DATABASE_URL — Supabase's *transaction pooler* string
 * (Project Settings -> Database -> Connect -> Transaction pooler, with
 * "Use IPv4 connection" on, since Vercel's functions can't reach the
 * IPv6-only dedicated pooler). Note this holds a real Postgres password,
 * not the publishable anon key used elsewhere.
 *
 * The pool is created lazily on first use rather than at module load, so
 * a missing or misconfigured DATABASE_URL degrades to "search and
 * sitemaps break" rather than "the entire site fails to build" — this
 * module is imported (via data.ts) by essentially every page.
 */

let pool: Pool | null = null;

export function getPgPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Missing DATABASE_URL. Set it in .env.local for local dev, and in the " +
        "Vercel project's Environment Variables for deployed builds. Use the " +
        "Supabase transaction-pooler string from Project Settings -> Database."
    );
  }

  // A small pool is plenty: each request runs one query, and Vercel's
  // functions are short-lived. Supabase's pooler does the real connection
  // multiplexing on its side.
  pool = new Pool({
    connectionString,
    max: 5,
    ssl: { rejectUnauthorized: false },
  });

  return pool;
}
