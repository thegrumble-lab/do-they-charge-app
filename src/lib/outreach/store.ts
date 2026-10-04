import "server-only";
import { Redis } from "@upstash/redis";

/**
 * Outreach state lives in Upstash Redis (connected through the Vercel
 * Marketplace), not Supabase, so the app keeps its anon-key-only setup.
 * Every key is prefixed "dc:" because the database may be shared with
 * other projects.
 */
export type Status = "queued" | "active" | "finished" | "replied" | "escalated" | "unsubscribed" | "bounced";
export type Campaign = "restaurant" | "press";

export type Prospect = {
  email: string;
  campaign: Campaign;
  name: string;
  subject: string;
  status: Status;
  step: number;
  first_message_id: string | null;
  last_message_id: string | null;
  last_sent_at: string | null;
  next_send_at: string | null;
  replied_at: string | null;
  ai_replies: number;
  created_at: string;
};

const P = "dc:outreach:prospects";
const STATE = "dc:outreach:state";
const SEEN = "dc:outreach:seen";
const EVENTS = "dc:outreach:events";

let client: Redis | null = null;
export function redis(): Redis {
  if (client) return client;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Outreach storage isn't connected (no Upstash Redis settings).");
  client = new Redis({ url, token });
  return client;
}

export async function allProspects(): Promise<Prospect[]> {
  const h = (await redis().hgetall<Record<string, Prospect>>(P)) ?? {};
  return Object.values(h);
}
export async function getProspect(email: string): Promise<Prospect | null> {
  return (await redis().hget<Prospect>(P, email.toLowerCase())) ?? null;
}
export async function saveProspect(p: Prospect) {
  await redis().hset(P, { [p.email]: p });
}
export async function updateProspect(email: string, patch: Partial<Prospect>) {
  const p = await getProspect(email);
  if (p) await saveProspect({ ...p, ...patch });
  return p;
}

export async function getState(key: string): Promise<string | null> {
  return (await redis().hget<string>(STATE, key)) ?? null;
}
export async function setState(key: string, value: string) {
  await redis().hset(STATE, { [key]: value });
}

/** Returns true the first time a message id is seen, false after that. */
export async function firstSeen(messageId: string): Promise<boolean> {
  return (await redis().sadd(SEEN, messageId)) === 1;
}

export async function logEvent(email: string | null, type: string, detail?: string) {
  const e = { at: new Date().toISOString(), email, type, detail: detail?.slice(0, 2000) };
  await redis().lpush(EVENTS, JSON.stringify(e));
  await redis().ltrim(EVENTS, 0, 1999);
}

/** Number of emails sent on a UK calendar date. */
export async function sentOn(date: string): Promise<number> {
  return Number((await redis().get<number>(`dc:outreach:sent:${date}`)) ?? 0);
}
export async function countSend(date: string) {
  const k = `dc:outreach:sent:${date}`;
  await redis().incr(k);
  await redis().expire(k, 60 * 60 * 24 * 14);
}
