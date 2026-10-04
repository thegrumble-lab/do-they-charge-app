import "server-only";
import { checkUnsubToken } from "./mail";
import { getProspect, logEvent, saveProspect, updateProspect } from "./store";

/** Marks an address as never-contact. Works even if it isn't a known prospect. */
export async function unsubscribe(email: string, token: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  if (!e || !token || !checkUnsubToken(e, token)) return false;
  if (await getProspect(e)) {
    await updateProspect(e, { status: "unsubscribed", next_send_at: null });
  } else {
    await saveProspect({
      email: e,
      campaign: "restaurant",
      name: e,
      subject: "",
      status: "unsubscribed",
      step: 0,
      first_message_id: null,
      last_message_id: null,
      last_sent_at: null,
      next_send_at: null,
      replied_at: null,
      ai_replies: 0,
      created_at: new Date().toISOString(),
    });
  }
  await logEvent(e, "unsubscribed", "Unsubscribe link");
  return true;
}
