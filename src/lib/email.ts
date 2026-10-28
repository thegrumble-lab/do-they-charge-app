import "server-only";
import crypto from "node:crypto";

/**
 * Site email (replies from hello@discretionary.uk and the daily summary) goes
 * through Resend, never the Zoho mailbox: Zoho's terms don't allow automated sending.
 * Cold outreach is separate and uses the outreach mailbox (src/lib/outreach/mail.ts).
 */
export type SiteMail = {
  from: { name: string; address: string };
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  inReplyTo?: string | null;
  references?: string[];
  headers?: Record<string, string>;
};

/** Sends one plain-text email through Resend. Returns the Message-ID we asked for, for threading. */
export async function sendSiteEmail(mail: SiteMail): Promise<string> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY isn't set, so site email can't be sent");
  const domain = mail.from.address.split("@")[1] ?? "discretionary.uk";
  const messageId = `<${crypto.randomUUID()}@${domain}>`;
  const headers: Record<string, string> = { "Message-ID": messageId, ...mail.headers };
  if (mail.inReplyTo) headers["In-Reply-To"] = mail.inReplyTo;
  const refs = (mail.references ?? []).filter(Boolean);
  if (refs.length) headers.References = refs.join(" ");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${mail.from.name} <${mail.from.address}>`,
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      reply_to: mail.replyTo ?? mail.from.address,
      headers,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return messageId;
}

/** The address site email and summaries come from. */
export function siteFrom(): { name: string; address: string } {
  const raw = process.env.EMAIL_FROM || "Discretionary <hello@discretionary.uk>";
  const m = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || "Discretionary", address: m[2] } : { name: "Discretionary", address: raw.trim() };
}
