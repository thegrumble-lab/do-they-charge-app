import { getChainViews } from "@/lib/chain-tracker-data";
import { VERDICT_META } from "@/content/chain-tracker";
import { SITE_URL } from "@/lib/site";

// The chain tracker as a CSV, for journalists and anyone citing the data.
export const revalidate = 86400;

function cell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const chains = await getChainViews();
  const header = [
    "chain",
    "policy",
    "rate",
    "applies_from_party_size",
    "summary",
    "detail",
    "source_url",
    "branches_listed",
    "last_checked",
    "changes_logged",
    "tracker_page",
  ];
  const lines = [header.join(",")];
  for (const c of chains) {
    lines.push(
      [
        c.chain,
        VERDICT_META[c.verdict].label,
        c.rate,
        c.groupSize,
        c.summary,
        c.note,
        c.sourceUrl,
        c.branches,
        c.checked,
        c.changes.map((ch) => `${ch.date}: ${ch.text}`).join("; "),
        `${SITE_URL}/chains/${c.slug}`,
      ]
        .map(cell)
        .join(",")
    );
  }
  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="discretionary-chain-tracker.csv"',
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
