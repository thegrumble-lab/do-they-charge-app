import { Pool } from "pg";

/**
 * Direct Postgres connection, used ONLY for the ranked-search path in
 * data.ts (searchRestaurants()'s fuzzy/exact-match branch).
 *
 * Why this exists: Supabase's PostgREST/API-gateway layer adds a
 * consistent ~3-5s delay specifically on complex RPC calls (like
 * search_restaurants_ranked()) that isn't present on simple table
 * selects, and isn't inside Postgres's own query execution (confirmed via
 * pg_stat_activity showing the connection idle during the "slow" window,
 * and via direct EXPLAIN ANALYZE showing the query itself runs in
 * 100-300ms). See HANDOFF.md for the full diagnosis — CPU/compute tier,
 * Vercel/Supabase region mismatch, RLS, plan_cache_mode, and connection
 * pooling were all tested and ruled out first.
 *
 * This connects straight to Postgres via Supabase's connection pooler,
 * skipping PostgREST entirely, for this one hot path. Every other
 * function in data.ts is unaffected and keeps using the anon-key
 * supabase-js client in supabase.ts — those paths were confirmed fast.
 *
 * Uses the DATABASE_URL env var (Supabase's pooler connection string,
 * e.g. from Project Settings → Database → Connection string → Session
 * or Transaction pooler). This is a real Postgres password, not the
 * anon/service_role JWTs used elsewhere — treat it with the same care as
 * any other production credential.
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Missing DATABASE_URL. Set it in .env.local for local dev, and in the " +
      "Vercel project's Environment Variables for deployed builds. Use the " +
      "Supabase connection-pooler string from Project Settings → Database."
  );
}

// A small pool is plenty here — this is only used for one query per search
// request, and Vercel serverless functions are short-lived anyway. Supabase's
// pooler (pgbouncer, in transaction mode) handles the real connection
// multiplexing on its side.
export const pgPool = new Pool({
  connectionString,
  max: 5,
  ssl: { rejectUnauthorized: false },
});
