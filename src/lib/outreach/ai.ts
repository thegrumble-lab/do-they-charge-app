import "server-only";
import { AI_FACTS, SIGNOFF } from "./copy";
import type { Campaign } from "./store";

export type AiDecision = {
  action: "reply" | "escalate" | "stop" | "ignore";
  kind: "confirmed" | "correction" | "question" | "other";
  reply?: string;
  changes?: string;
  firstName?: string;
  summary: string;
};

const RESTAURANT = `You handle replies to Discretionary's emails asking UK restaurants to confirm that they don't add a service charge, as listed on discretionary.uk. You write as Matt from Discretionary.
${AI_FACTS}
DECIDE ONE ACTION and return ONLY a JSON object, no other text:
{"action": "reply" | "escalate" | "stop" | "ignore", "kind": "confirmed" | "correction" | "question" | "other", "reply": "<email body, only when action is reply and kind is not confirmed>", "changes": "<only for corrections: what is different, e.g. 'adds 12.5% to every bill' or '10% for groups of 8+'>", "firstName": "<their first name if they signed with one, else empty>", "summary": "<one short sentence for the site owner>"}

KIND:
- "confirmed": they say the listing is correct: no service charge is added.
- "correction": they say they do add a service charge (to every bill, or for groups, private dining or events), or give other changed facts.
- "question": they ask something about Discretionary.
- "other": anything else.

ACTION:
- "ignore": out-of-office or automatic messages, booking-system acknowledgements, read receipts, or nothing needing an answer.
- "stop": they say no, not interested, unsubscribe, remove me, or ask not to be contacted. Do not reply.
- "reply": (a) they confirm: set action "reply" and kind "confirmed" and leave "reply" empty, because a fixed thank-you is sent; (b) they send a clear correction: thank them and say we'll update the page within a few working days; (c) they ask a question the facts above fully answer. Write the reply for (b) and (c).
- "escalate": anything else. In particular: requests to remove the restaurant from the site, complaints, anger, legal or data protection questions (other than unsubscribe), questions the facts don't fully answer, requests for a call or meeting, partnership, advertising or sales pitches, attachments you can't see, unclear or partial answers, a referral to another person or address, questions about who runs the site, or if you are unsure. Do not reply.

REPLY RULES (when you write a reply):
- Answer only from the facts above. Never invent features, numbers, dates or promises. Never repeat their policy details back beyond saying thanks.
- Friendly, brief, British English. 30 to 110 words. Plain text, no markdown, no bullet symbols other than "-".
- Never use em dashes or en dashes. Never use the word "worth".
- Start with "Hi" (or "Hi <first name>," if they signed with a first name). End with:
Thanks again,
${SIGNOFF}`;

const PRESS = `You triage replies to Discretionary's emails pitching service charge data to UK journalists. You never write replies; the site owner answers every journalist personally.
DECIDE ONE ACTION and return ONLY a JSON object, no other text:
{"action": "escalate" | "stop" | "ignore", "kind": "question" | "other", "summary": "<one short sentence for the site owner saying what they want>"}
- "ignore": out-of-office or automatic messages, read receipts, newsroom auto-acknowledgements.
- "stop": they say no thanks, not interested, unsubscribe, or ask not to be contacted.
- "escalate": anything else, including any interest, questions, requests for data or comment, or a referral to a colleague.`;

/** Asks Claude what to do with an incoming reply. Without an API key, everything is escalated. */
export async function decideReply(input: { campaign: Campaign; name: string; theirMessage: string; ourLastEmail: string }): Promise<AiDecision> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { action: "escalate", kind: "other", summary: "No AI key set, so this reply needs you." };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.OUTREACH_AI_MODEL || "claude-haiku-4-5",
        max_tokens: 700,
        system: input.campaign === "press" ? PRESS : RESTAURANT,
        messages: [
          {
            role: "user",
            content: `${input.campaign === "press" ? "Journalist" : "Restaurant"}: ${input.name}\n\nOur last email to them:\n"""\n${input.ourLastEmail.slice(0, 3500)}\n"""\n\nTheir reply:\n"""\n${input.theirMessage}\n"""`,
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("AI reply failed", res.status, await res.text());
      return { action: "escalate", kind: "other", summary: "The AI couldn't process this reply, so it needs you." };
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const raw = data.content?.find((c) => c.type === "text")?.text ?? "";
    const parsed = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as AiDecision;
    if (!["reply", "escalate", "stop", "ignore"].includes(parsed.action)) throw new Error("bad action");
    if (!["confirmed", "correction", "question", "other"].includes(parsed.kind)) parsed.kind = "other";
    // Journalists always get a personal reply from the site owner.
    if (input.campaign === "press" && parsed.action === "reply") parsed.action = "escalate";
    if (parsed.action === "reply" && parsed.kind !== "confirmed") {
      const r = (parsed.reply ?? "").trim();
      // Guard rails: escalate rather than send anything that breaks the house rules.
      if (r.length < 20 || r.length > 1200 || /[–—]/.test(r) || /\bworth\b/i.test(r)) {
        return { action: "escalate", kind: parsed.kind, changes: parsed.changes, summary: `AI draft didn't pass checks. ${parsed.summary ?? ""}`.trim() };
      }
      parsed.reply = r;
    }
    return {
      action: parsed.action,
      kind: parsed.kind,
      reply: parsed.reply,
      changes: parsed.changes ? String(parsed.changes).slice(0, 1500) : undefined,
      firstName: parsed.firstName ? String(parsed.firstName).replace(/[^\p{L}' -]/gu, "").slice(0, 30) || undefined : undefined,
      summary: String(parsed.summary ?? "").slice(0, 300),
    };
  } catch (err) {
    console.error("AI reply error", err);
    return { action: "escalate", kind: "other", summary: "The AI couldn't process this reply, so it needs you." };
  }
}
