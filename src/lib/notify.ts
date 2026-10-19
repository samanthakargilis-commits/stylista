import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

export function appUrl() {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}

export const pushConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

export const smsConfigured = () =>
  Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);

export type PushPayload = { title: string; body: string; image?: string; url: string };

/** Sends to every device the person turned notifications on for. Returns how many got it. */
export async function sendPush(db: SupabaseClient, userId: string, payload: PushPayload): Promise<number> {
  if (!pushConfigured()) return 0;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:stylista@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  const { data: subs } = await db.from("push_subscriptions").select("*").eq("user_id", userId);
  let sent = 0;
  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload));
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      // The browser dropped this subscription; forget it.
      if (status === 404 || status === 410) await db.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    }
  }
  return sent;
}

/** Text message with an optional picture (MMS) through Twilio. */
export async function sendSms(to: string, body: string, mediaUrl?: string) {
  if (!smsConfigured() || !to) return false;
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const form = new URLSearchParams({ To: to, From: process.env.TWILIO_FROM!, Body: body });
  if (mediaUrl) form.set("MediaUrl", mediaUrl);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  if (!res.ok) throw new Error(`Text message failed (${res.status}): ${await res.text()}`);
  return true;
}
