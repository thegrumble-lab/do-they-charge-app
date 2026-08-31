import { createClient } from "@supabase/supabase-js";

/**
 * Single Supabase client, used for both reads and diner-submitted writes.
 *
 * It authenticates with the *anon* key only — never the service_role key.
 * Every table it touches (restaurants, reports) has Row Level Security
 * enabled, with policies that:
 *   - allow anyone to SELECT (the whole point of a public directory), and
 *   - allow anyone to INSERT a report/restaurant, but only within tight
 *     constraints (valid status, length limits) enforced by the database
 *     itself — see the policies created in the Supabase SQL editor.
 *
 * That means the anon key is safe to ship to Vercel as a plain env var:
 * it can't do anything the RLS policies don't already allow, so there's
 * no need for the far more powerful service_role key anywhere in this
 * app.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Set them in .env.local for local dev, and in the Vercel project's " +
      "Environment Variables for deployed builds."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});
