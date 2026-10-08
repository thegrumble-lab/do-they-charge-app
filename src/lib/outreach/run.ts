import "server-only";
import prospectsData from "@/data/outreach.json";
import { FOLLOW_UP_DAYS, SEQUENCE_LENGTH, confirmationReply, renderStep, type Seed } from "./copy";
import { OUR_DOMAIN, fetchInbox, mailbox, sendInternal, sendOutreach, stripQuoted, unsubUrl } from "./mail";
import { decideReply } from "./ai";
import { allProspects, countSend, firstSeen, getState, logEvent, saveProspect, sentOn, setState, updateProspect, type Prospect } from "./store";

const SEEDS = prospectsData as Seed[];
const seedFor = (email: string) => SEEDS.find((s) => s.email === email);

type ReplyItem = { name: string; email: string; campaign: string; action: string; kind?: string; summary: string; theirs: string; ours?: string; changes?: string; page?: string; followUp?: string };

export type RunReport = {
  imported: number;
  sent: { email: string; name: string; campaign: string; step: number }[];
  replies: ReplyItem[];
  bounced: string[];
  errors: string[];
  notes: string[];
};

const FREE_DOMAINS = /^(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|me|aol|btinternet|sky|virginmedia|talktalk|protonmail|proton)\./i;
const domainOf = (email: string) => email.split("@")[1]?.toLowerCase() ?? "";
const businessDomain = (email: string) => {
  const d = domainOf(email);
  return d && !FREE_DOMAINS.test(d) ? d : null;
};

/* ---------- Import: prospects from src/data/outreach.json ---------- */

async function importProspects(report: RunReport) {
  const existing = new Set((await allProspects()).map((p) => p.email));
  const now = new Date().toISOString();
  for (const s of SEEDS) {
    if (existing.has(s.email)) continue;
    await saveProspect({
      email: s.email,
      campaign: s.campaign,
      name: s.name,
      subject: "",
      status: "queued",
      step: 0,
      first_message_id: null,
      last_message_id: null,
      last_sent_at: null,
      next_send_at: null,
      replied_at: null,
      ai_replies: 0,
      created_at: now,
    });
    report.imported++;
  }
  if (report.imported) await logEvent(null, "imported", `${report.imported} prospects added to the queue`);
}

/* ---------- Inbox: replies, bounces, AI answers ---------- */

async function processInbox(report: RunReport, deadline: number) {
  const box = mailbox();
  if (!box) {
    report.notes.push("Outreach mailbox not configured, so replies weren't checked.");
    return;
  }
  const last = await getState("last_inbox_check");
  const since = new Date(last ? new Date(last).getTime() - 2 * 86400_000 : Date.now() - 7 * 86400_000);
  const started = new Date().toISOString();
  const messages = await fetchInbox(since);

  const prospects = await allProspects();
  const byEmail = new Map(prospects.map((p) => [p.email, p]));
  const byDomain = new Map<string, Prospect>();
  for (const p of prospects) {
    const d = businessDomain(p.email);
    // Several journalists share a publisher domain, so only match restaurants by domain.
    if (d && p.campaign === "restaurant" && !byDomain.has(d)) byDomain.set(d, p);
  }

  for (const m of messages) {
    if (Date.now() > deadline) {
      report.notes.push("Stopped reading replies early to stay within the time limit; the rest will be handled next run.");
      return;
    }
    if (!m.from || m.from === box.user.toLowerCase() || m.from === box.from.toLowerCase()) continue;

    // Bounces (the mailbox is shared, so only act on bounces naming our prospects)
    if (/mailer-daemon|postmaster/i.test(m.from)) {
      const hits = prospects.filter((p) => p.status !== "bounced" && p.step > 0 && m.text.toLowerCase().includes(p.email));
      if (!hits.length || !(await firstSeen(m.messageId))) continue;
      for (const p of hits) {
        await updateProspect(p.email, { status: "bounced", next_send_at: null });
        await logEvent(p.email, "bounced", m.subject);
        report.bounced.push(p.name);
      }
      continue;
    }

    // Only mail sent to this site's address; the mailbox also serves another site.
    if (!m.to.some((a) => a.endsWith(`@${OUR_DOMAIN}`))) continue;

    const d = businessDomain(m.from);
    const p = byEmail.get(m.from) ?? (d ? byDomain.get(d) : undefined);
    if (!p || p.step === 0) continue; // not one of ours, or we haven't emailed them yet
    if (!(await firstSeen(m.messageId))) continue; // handled on an earlier run
    if (m.autoSubmitted) continue; // out-of-office: keep the sequence going

    const seed = seedFor(p.email);
    const theirs = stripQuoted(m.text);
    await logEvent(p.email, "reply_in", theirs);
    const now = new Date().toISOString();
    await updateProspect(p.email, { replied_at: now, next_send_at: null, status: p.status === "escalated" ? "escalated" : "replied" });

    const item = (x: Partial<ReplyItem> & { action: string; summary: string }): ReplyItem => ({ name: p.name, email: m.from, campaign: p.campaign, theirs, page: seed?.page, ...x });

    if (/^\s*(unsubscribe|remove me|stop)\s*\.?\s*$/i.test(theirs)) {
      await updateProspect(p.email, { status: "unsubscribed" });
      await logEvent(p.email, "unsubscribed", "Replied asking to unsubscribe");
      report.replies.push(item({ action: "stopped", summary: "Asked to unsubscribe. Removed." }));
      continue;
    }

    let decision;
    if (p.status === "escalated" || p.ai_replies >= 6 || !seed) {
      decision = {
        action: "escalate" as const,
        kind: "other" as const,
        summary: p.status === "escalated" ? "You're already handling this conversation." : !seed ? "No longer on the prospect list, so this one needs you." : "Several automatic replies already, so this one needs you.",
      };
    } else {
      const ours = renderStep(Math.max(0, p.step - 1), seed, "").text;
      decision = await decideReply({ campaign: p.campaign, name: p.name, theirMessage: theirs, ourLastEmail: ours });
    }

    if (decision.action === "reply" && seed) {
      const text = decision.kind === "confirmed" ? confirmationReply(seed, "firstName" in decision ? decision.firstName ?? null : null) : decision.reply;
      if (!text) {
        await updateProspect(p.email, { status: "escalated" });
        report.replies.push(item({ action: "needs you", kind: decision.kind, summary: decision.summary }));
        continue;
      }
      try {
        const subject = `Re: ${m.subject.replace(/^(re|fwd?):\s*/i, "")}`;
        const id = await sendOutreach({ to: m.from, subject, text, inReplyTo: m.messageId, references: [p.first_message_id ?? "", m.messageId], listUnsubscribe: false });
        await updateProspect(p.email, { ai_replies: p.ai_replies + 1, last_message_id: id });
        await logEvent(p.email, "ai_reply", text);
        report.replies.push(item({ action: "AI replied", kind: decision.kind, summary: decision.summary, ours: text, changes: "changes" in decision ? decision.changes : undefined, followUp: "follow_up" in decision ? decision.follow_up : undefined }));
      } catch (err) {
        await updateProspect(p.email, { status: "escalated" });
        report.errors.push(`Couldn't send the reply to ${p.name}: ${(err as Error).message}`);
        report.replies.push(item({ action: "needs you", kind: decision.kind, summary: decision.summary }));
      }
    } else if (decision.action === "stop") {
      await updateProspect(p.email, { status: "unsubscribed" });
      await logEvent(p.email, "unsubscribed", decision.summary);
      report.replies.push(item({ action: "stopped", summary: decision.summary }));
    } else if (decision.action === "escalate") {
      await updateProspect(p.email, { status: "escalated" });
      await logEvent(p.email, "escalated", decision.summary);
      report.replies.push(item({ action: "needs you", kind: decision.kind, summary: decision.summary, changes: "changes" in decision ? decision.changes : undefined }));
    } else {
      report.replies.push(item({ action: "no reply needed", summary: decision.summary }));
    }
  }
  await setState("last_inbox_check", started);
}

/* ---------- Sending: first emails and follow-ups ---------- */

function ukParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { weekday: get("weekday"), date: `${get("year")}-${get("month")}-${get("day")}` };
}

function businessDaysBetween(from: string, to: string) {
  let n = 0;
  const d = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  while (d < end) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) n++;
  }
  return n;
}

async function sendDue(report: RunReport, deadline: number) {
  if (process.env.OUTREACH_ENABLED !== "true") {
    report.notes.push("Sending is switched off (OUTREACH_ENABLED isn't true), so nothing was sent.");
    return;
  }
  if (!mailbox()) {
    report.notes.push("Outreach mailbox not configured, so nothing was sent.");
    return;
  }
  if ((await getState("paused")) === "true") {
    report.notes.push("Outreach is paused.");
    return;
  }
  const today = ukParts();
  if (today.weekday === "Sat" || today.weekday === "Sun") {
    report.notes.push("Weekend, so no emails were sent.");
    return;
  }

  const first = (await getState("first_send_date")) ?? today.date;
  const max = Number(process.env.OUTREACH_MAX_PER_DAY || 20);
  // The mailbox also sends for another site, so start gently: 8 on day one, rising by 3 each working day.
  const cap = Math.min(max, 8 + 3 * businessDaysBetween(first, today.date));
  let budget = cap - (await sentOn(today.date));
  if (budget <= 0) return;

  const now = Date.now();
  const all = await allProspects();
  const followUps = all.filter((p) => p.status === "active" && p.next_send_at && Date.parse(p.next_send_at) <= now).sort((a, b) => (a.next_send_at! < b.next_send_at! ? -1 : 1));
  const order = new Map(SEEDS.map((s, i) => [s.email, i]));
  const fresh = all.filter((p) => p.status === "queued").sort((a, b) => (order.get(a.email) ?? 9999) - (order.get(b.email) ?? 9999));
  const queue = [...followUps, ...fresh].slice(0, budget);

  for (const p of queue) {
    if (Date.now() > deadline || budget <= 0) break;
    if (p.step >= SEQUENCE_LENGTH) continue;
    const seed = seedFor(p.email);
    if (!seed) continue; // removed from the list
    const { subject, text } = renderStep(p.step, seed, unsubUrl(p.email));
    try {
      const id = await sendOutreach({
        to: p.email,
        subject,
        text,
        inReplyTo: p.step > 0 ? p.last_message_id : null,
        references: p.step > 0 ? [p.first_message_id ?? "", p.last_message_id ?? ""] : [],
      });
      const done = p.step + 1 >= SEQUENCE_LENGTH;
      await updateProspect(p.email, {
        step: p.step + 1,
        status: done ? "finished" : "active",
        subject: p.step === 0 ? subject : p.subject,
        first_message_id: p.step === 0 ? id : p.first_message_id,
        last_message_id: id,
        last_sent_at: new Date().toISOString(),
        next_send_at: done ? null : new Date(Date.now() + FOLLOW_UP_DAYS[p.campaign] * 86400_000).toISOString(),
      });
      await countSend(today.date);
      await logEvent(p.email, "sent", `Step ${p.step + 1}: ${subject}`);
      report.sent.push({ email: p.email, name: p.name, campaign: p.campaign, step: p.step + 1 });
      budget--;
      if ((await getState("first_send_date")) === null) await setState("first_send_date", today.date);
      await new Promise((r) => setTimeout(r, 4000 + Math.random() * 5000));
    } catch (err) {
      report.errors.push(`Send to ${p.name} failed: ${(err as Error).message}`);
      await logEvent(p.email, "error", (err as Error).message);
      if (/auth|login|credentials|535/i.test((err as Error).message)) break; // mailbox problem: stop for today
    }
  }
}

/* ---------- Daily summary ---------- */

const flat = (s: string, n = 600) => s.replace(/\s+/g, " ").slice(0, n);

async function sendDigest(report: RunReport) {
  const to = process.env.OUTREACH_DIGEST_TO;
  if (!to || !mailbox()) return;
  const sendingOff = process.env.OUTREACH_ENABLED !== "true";
  const interesting = sendingOff || report.replies.length || report.errors.length || report.bounced.length || report.sent.length || report.imported;
  if (!interesting) return;

  const needs = report.replies.filter((r) => r.action === "needs you");
  const publish = report.replies.filter((r) => r.action === "AI replied" && (r.kind === "confirmed" || r.kind === "correction"));
  const followUps = report.replies.filter((r) => r.followUp && r.action === "AI replied");
  const handled = report.replies.filter((r) => r.action !== "needs you" && !publish.includes(r) && !followUps.includes(r));
  const L: string[] = [];
  L.push(`Discretionary outreach, ${new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", dateStyle: "full" }).format(new Date())}`, "");

  if (followUps.length) {
    L.push(`FOLLOW-UPS YOU OWE (${followUps.length})`);
    for (const r of followUps) {
      L.push(`- ${r.campaign === "press" ? "[Press] " : ""}${r.name} <${r.email}>`);
      L.push(`  To do: ${r.followUp}`);
      L.push(`  They wrote: ${flat(r.theirs, 700)}`);
      if (r.ours) L.push(`  We replied: ${flat(r.ours, 500)}`);
    }
    L.push("Each one has already had a reply saying you'll come back to them. Reply as hello@discretionary.uk.", "");
  }

  if (needs.length) {
    L.push(`NEEDS YOU (${needs.length})`);
    for (const r of needs) {
      L.push(`- ${r.campaign === "press" ? "[Press] " : ""}${r.name} <${r.email}>: ${r.summary}`);
      if (r.changes) L.push(`  Proposed changes: ${flat(r.changes, 800)}`);
      L.push(`  They wrote: ${flat(r.theirs)}`);
    }
    L.push("Reply to these yourself as hello@discretionary.uk. The automation won't contact them again.", "");
  }
  if (publish.length) {
    L.push(`READY TO PUBLISH (${publish.length})`);
    for (const r of publish) {
      L.push(`- ${r.name}: ${r.kind === "confirmed" ? "confirmed no service charge" : "sent a correction"}. ${r.summary}`);
      if (r.changes) L.push(`  Changes: ${flat(r.changes, 800)}`);
      if (r.page) L.push(`  Page: ${r.page}`);
    }
    L.push("To publish, open a Claude session and say which of these to apply.", "");
  }
  if (handled.length) {
    L.push("HANDLED AUTOMATICALLY");
    for (const r of handled) {
      L.push(`- ${r.name}: ${r.action}. ${r.summary}`);
      if (r.ours) L.push(`  We replied: ${flat(r.ours)}`);
    }
    L.push("");
  }
  if (publish.some((r) => r.ours)) {
    L.push("REPLIES SENT");
    for (const r of publish) if (r.ours) L.push(`- ${r.name}: ${flat(r.ours, 400)}`);
    L.push("");
  }
  const restaurants = report.sent.filter((s) => s.campaign === "restaurant");
  const press = report.sent.filter((s) => s.campaign === "press");
  L.push(`Sent today: ${report.sent.length} (${restaurants.length} to restaurants, ${press.length} to journalists; ${report.sent.filter((s) => s.step > 1).length} of them follow-ups)`);
  if (report.imported) L.push(`Added to the queue: ${report.imported}`);
  if (report.bounced.length) L.push(`Bounced: ${report.bounced.join(", ")}`);
  if (report.errors.length) L.push("", "PROBLEMS", ...report.errors.map((e) => `- ${e}`));
  if (report.notes.length) L.push("", ...report.notes.map((n) => `Note: ${n}`));

  if (sendingOff) {
    const queued = new Set((await allProspects().catch(() => [] as Prospect[])).filter((p) => p.status === "queued").map((p) => p.email));
    for (const campaign of ["restaurant", "press"] as const) {
      const next = SEEDS.find((x) => x.campaign === campaign && queued.has(x.email)) ?? SEEDS.find((x) => x.campaign === campaign);
      if (!next) continue;
      const first = renderStep(0, next, unsubUrl(next.email));
      const follow = renderStep(1, next, unsubUrl(next.email));
      L.push(
        "",
        `PREVIEW: ${campaign === "press" ? "JOURNALISTS" : "RESTAURANTS"} (sending is switched off, so nothing went out)`,
        `Next in the queue: ${next.name} <${next.email}>. This is exactly what they'll receive:`,
        "",
        `Subject: ${first.subject}`,
        "",
        first.text,
        "",
        `And the follow-up ${campaign === "press" ? 5 : 7} days later if they don't reply:`,
        "",
        `Subject: ${follow.subject}`,
        "",
        follow.text,
      );
    }
  }

  const subject =
    sendingOff && !needs.length && !publish.length
      ? "Discretionary outreach: preview (sending is off)"
      : needs.length
        ? `Discretionary outreach: ${needs.length} ${needs.length === 1 ? "reply needs" : "replies need"} you`
        : publish.length
          ? `Discretionary outreach: ${publish.length} ready to publish`
          : followUps.length
            ? `Discretionary outreach: ${followUps.length} ${followUps.length === 1 ? "follow-up" : "follow-ups"} owed`
            : "Discretionary outreach: daily summary";
  await sendInternal(to, subject, L.join("\n"));
}

/** The daily job. Safe to run more than once a day. */
export async function runOutreach(opts: { digest?: boolean } = {}): Promise<RunReport> {
  const deadline = Date.now() + 250_000;
  const report: RunReport = { imported: 0, sent: [], replies: [], bounced: [], errors: [], notes: [] };
  const step = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (err) {
      console.error(`Outreach ${name} failed`, err);
      report.errors.push(`${name} failed: ${(err as Error).message}`);
    }
  };
  await step("Import", () => importProspects(report));
  await step("Reply check", () => processInbox(report, deadline - 90_000));
  await step("Sending", () => sendDue(report, deadline));
  if (opts.digest !== false) await step("Summary email", () => sendDigest(report));
  return report;
}
