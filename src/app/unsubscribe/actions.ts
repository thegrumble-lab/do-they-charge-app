"use server";
import { redirect } from "next/navigation";
import { unsubscribe } from "@/lib/outreach/unsubscribe";

export async function confirmUnsubscribe(form: FormData) {
  const e = String(form.get("e") ?? "");
  const t = String(form.get("t") ?? "");
  const ok = await unsubscribe(e, t).catch(() => false);
  redirect(ok ? "/unsubscribe?done=1" : "/unsubscribe?error=1");
}
