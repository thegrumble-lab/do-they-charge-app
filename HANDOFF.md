# Do They Charge? — handoff notes

## What's actually built and verified right now

- A real Next.js app (App Router, TypeScript) — `npm run build` succeeds, `npm run start` serves it, and I tested it live: homepage search/filter, a restaurant page, an area browse page, and the report-submission API all work.
- Every restaurant gets its own URL and its own `<title>`/meta description built for the exact long-tail query it should rank for ("Does [name] add a service charge?"). That was the whole point of moving off the single-page artifact.
- The visual identity carries over from the artifact you already tested — same receipt/stamp look, same fonts and colours, just built as real stylesheets instead of one embedded `<style>` block.
- The submission form has basic anti-abuse built in: a honeypot field (bots fill every input; real visitors never see it) and a simple per-IP rate limit. Both were tested and work.
- Loaded with a 520-restaurant **sample** (Westminster, Birmingham, Glasgow City, Edinburgh, Manchester, Leeds, North Yorkshire, Camden — the top areas by restaurant count from the FSA data), not the full national set. See "Going nationwide for real" below.

## What's deliberately stubbed, and why

**Data storage is in-memory, not a real database.** `src/lib/data.ts` holds every function a real backend would need (`getAllRestaurants`, `getRestaurantBySlug`, `addReportDev`, etc.) but right now they read/write a JS array that resets every time the server restarts. This was the fastest way to get something real and testable in front of you today. Nothing that calls these functions needs to change when you swap them for actual database queries — only the insides of `src/lib/data.ts` and the one write in `src/app/api/reports/route.ts`.

**Why:** I can't create hosting, domain, or database accounts on your behalf — those need your email, and in the domain's case, your money. Building against a real database before you've chosen and set one up would mean guessing at connection details I can't test. This gets you a fully working app today; wiring up permanent storage is a short, well-defined next step once you've picked a provider.

## Going nationwide for real

The full FSA dataset — 140,921 restaurant/café records, already slugged and ready to import — is sitting at:

`Downloads/do-they-charge-data/restaurants_seed.json` (33MB, on your machine)

Once a real database exists, import that file wholesale as the seed `restaurants` table, then switch the app off the JSON sample. Two code changes needed at that point (both are called out in comments already):

1. In `src/app/[area]/[slug]/page.tsx`, replace `generateStaticParams` returning every slug with on-demand generation instead — pre-building 140k pages at deploy time would make builds painfully slow. Add `export const dynamicParams = true;` and `export const revalidate = 3600;` (or similar) so pages generate on first visit and get cached, which is the standard pattern for a dataset this size.
2. Point `src/lib/data.ts`'s functions at real queries instead of the in-memory array.

## What you need to do (the parts only you can do)

1. **Push this to a GitHub repo.** The project's already got a local git repo initialised (`git init` ran as part of scaffolding) — create a repo on GitHub and push it.
2. **Pick a host and connect the repo.** You said you're not sure yet — Vercel is the natural fit for Next.js (free tier, connects straight to GitHub, deploys on every push) but Netlify and Cloudflare Pages both work fine too. Whichever you pick, this code doesn't need to change.
3. **Register the domain** you want this on, and point it at whichever host you choose (the host's dashboard walks you through the DNS records).
4. **Create a database.** For this scale and budget, a free-tier hosted Postgres (Supabase is the easiest to set up) is the standard choice. Once it exists, send me the connection details (or set them as environment variables yourself) and I'll wire up `src/lib/data.ts` and the API route to it, then import the full 140k-row dataset.
5. **Decide on moderation.** Right now every report auto-publishes instantly, same as the artifact you already tested. That's fine for a private validation link — worth a second thought once this is a public, indexed, nationwide site with real restaurants' names attached. Options range from "leave it as-is" to a lightweight review queue. Your call once you see how submissions behave.

## Running it yourself in the meantime

```
npm install
npm run dev
```

Then open `http://localhost:3000`.
