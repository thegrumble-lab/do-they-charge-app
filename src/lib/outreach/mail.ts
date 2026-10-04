import "server-only";
import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { SITE_URL } from "@/lib/site";

/**
 * Outreach mailbox. hello@discretionary.uk is an alias on a Zoho Mail
 * mailbox (EU data centre) that also serves another site, so we log in as
 * that mailbox (OUTREACH_SMTP_USER), send from the alias
 * (OUTREACH_FROM_ADDRESS), and only ever read mail addressed to this
 * domain.
 */
export function mailbox() {
  const user = process.env.OUTREACH_SMTP_USER;
  const pass = process.env.OUTREACH_SMTP_PASS;
  if (!user || !pass) return null;
  return {
    user,
    pass,
    from: process.env.OUTREACH_FROM_ADDRESS || "hello@discretionary.uk",
    fromName: process.env.OUTREACH_FROM_NAME || "Discretionary",
  };
}

export const OUR_DOMAIN = "discretionary.uk";

function secret() {
  const s = process.env.CRON_SECRET;
  if (!s) throw new Error("Missing CRON_SECRET");
  return s;
}

export function unsubToken(email: string): string {
  return crypto.createHmac("sha256", secret()).update(`unsub:${email.toLowerCase()}`).digest("base64url").slice(0, 24);
}

export function checkUnsubToken(email: string, token: string): boolean {
  const expected = unsubToken(email);
  return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function unsubUrl(email: string): string {
  return `${SITE_URL}/unsubscribe?e=${encodeURIComponent(email)}&t=${unsubToken(email)}`;
}

type Outgoing = { to: string; subject: string; text: string; inReplyTo?: string | null; references?: string[]; listUnsubscribe?: boolean };

function transport() {
  const box = mailbox();
  if (!box) throw new Error("Outreach mailbox not configured");
  return {
    box,
    t: nodemailer.createTransport({ host: process.env.OUTREACH_SMTP_HOST || "smtppro.zoho.eu", port: 465, secure: true, auth: { user: box.user, pass: box.pass } }),
  };
}

/** Sends one plain-text email from the outreach address. Returns the Message-ID. */
export async function sendOutreach(mail: Outgoing): Promise<string> {
  const { box, t } = transport();
  const oneClick = `${SITE_URL}/api/unsubscribe?e=${encodeURIComponent(mail.to)}&t=${unsubToken(mail.to)}`;
  const info = await t.sendMail({
    from: { name: box.fromName, address: box.from },
    replyTo: box.from,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    inReplyTo: mail.inReplyTo ?? undefined,
    references: mail.references?.filter(Boolean),
    headers:
      mail.listUnsubscribe === false
        ? undefined
        : { "List-Unsubscribe": `<${oneClick}>, <mailto:${box.from}?subject=unsubscribe>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  });
  t.close();
  return info.messageId;
}

/** Internal email (the daily digest) from the same address. */
export async function sendInternal(to: string, subject: string, text: string) {
  const { box, t } = transport();
  await t.sendMail({ from: { name: box.fromName, address: box.from }, to, subject, text });
  t.close();
}

export type Incoming = {
  messageId: string;
  from: string;
  to: string[];
  subject: string;
  text: string;
  autoSubmitted: boolean;
};

/** Reads inbox messages received since the given date. */
export async function fetchInbox(since: Date): Promise<Incoming[]> {
  const box = mailbox();
  if (!box) return [];
  const client = new ImapFlow({ host: process.env.OUTREACH_IMAP_HOST || "imappro.zoho.eu", port: 993, secure: true, auth: { user: box.user, pass: box.pass }, logger: false });
  const out: Incoming[] = [];
  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  try {
    const uids = await client.search({ since }, { uid: true });
    if (uids && uids.length > 0) {
      for await (const msg of client.fetch(uids.slice(-300), { uid: true, source: true }, { uid: true })) {
        if (!msg.source) continue;
        const parsed = await simpleParser(msg.source);
        const addrs = (v: typeof parsed.to) => (Array.isArray(v) ? v : v ? [v] : []).flatMap((a) => a.value.map((x) => (x.address ?? "").toLowerCase()));
        const deliveredTo = String(parsed.headers.get("delivered-to") ?? "").toLowerCase();
        const auto = String(parsed.headers.get("auto-submitted") ?? "").toLowerCase();
        out.push({
          messageId: parsed.messageId ?? `uid-${msg.uid}`,
          from: parsed.from?.value?.[0]?.address?.toLowerCase() ?? "",
          to: [...addrs(parsed.to), ...addrs(parsed.cc), deliveredTo].filter(Boolean),
          subject: parsed.subject ?? "",
          text: (parsed.text ?? "").slice(0, 8000),
          autoSubmitted: (auto !== "" && auto !== "no") || /out of (the )?office|automatic reply|auto.?reply/i.test(parsed.subject ?? ""),
        });
      }
    }
  } finally {
    lock.release();
    await client.logout().catch(() => undefined);
  }
  return out;
}

/** Removes quoted history so the AI only sees what the person wrote. */
export function stripQuoted(text: string): string {
  const lines = text.split(/\r?\n/);
  const cut = lines.findIndex(
    (l) => /^On .+wrote:$/.test(l.trim()) || /^-{2,}\s*Original Message/i.test(l) || /^From: /.test(l) || /^-{4,} On .+ wrote -{4,}/.test(l.trim()) || l.trim() === "--",
  );
  const body = (cut >= 0 ? lines.slice(0, cut) : lines).filter((l) => !l.startsWith(">"));
  return body.join("\n").trim().slice(0, 4000);
}
