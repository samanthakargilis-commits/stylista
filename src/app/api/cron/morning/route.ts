import { planDay } from "@/lib/planner";
import { appUrl, sendPush, sendSms } from "@/lib/notify";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendLook, telegram } from "@/lib/telegram";
import { localParts } from "@/lib/time";
import type { DayPlanRow, Profile } from "@/lib/types";

export const maxDuration = 300;

/** People handled per run; the job runs every 15 minutes, so a backlog clears quickly. */
const BATCH = 5;

/**
 * Runs every ~15 minutes (see .github/workflows/morning.yml). For everyone whose
 * notification time has passed today, plans the day and sends the look.
 */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data: profiles, error } = await db
    .from("profiles")
    .select("*")
    .or("notify_push.eq.true,notify_sms.eq.true,notify_telegram.eq.true")
    .returns<Profile[]>();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const due = (profiles ?? []).filter((p) => {
    const now = localParts(p.timezone);
    return now.time >= p.notify_time && p.last_notified_on !== now.date;
  });

  const results = [];
  for (const profile of due.slice(0, BATCH)) {
    const today = localParts(profile.timezone).date;
    // Claim the day first so overlapping runs never double-send.
    const { data: claimed } = await db
      .from("profiles")
      .update({ last_notified_on: today })
      .eq("user_id", profile.user_id)
      .or(`last_notified_on.is.null,last_notified_on.neq.${today}`)
      .select("user_id");
    if (!claimed?.length) continue;
    results.push(await deliver(profile, today).catch((e) => ({ user: profile.user_id, error: String(e) })));
  }
  return Response.json({ due: due.length, handled: results });
}

async function deliver(profile: Profile, date: string) {
  const db = supabaseAdmin();
  const existing = await db
    .from("day_plans")
    .select("*")
    .eq("user_id", profile.user_id)
    .eq("date", date)
    .maybeSingle<DayPlanRow>();

  let row: DayPlanRow;
  try {
    row = existing.data ?? (await planDay(db, profile.user_id, date));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await sendPush(db, profile.user_id, { title: "Stylista", body: message, url: `${appUrl()}/` });
    if (profile.notify_telegram && profile.telegram_chat_id) {
      await telegram("sendMessage", { chat_id: profile.telegram_chat_id, text: `Stylista: ${message}` }).catch(() => {});
    }
    throw e;
  }

  const collage = `${appUrl()}/api/collage/${row.id}?option=0`;
  const top = row.plan.options[0];
  const pack = row.plan.pack ? ` Pack: ${row.plan.pack.note}` : "";
  const pushed = profile.notify_push
    ? await sendPush(db, profile.user_id, {
        title: row.plan.dayType,
        body: `${row.plan.headline}${pack}`,
        image: collage,
        url: `${appUrl()}/`,
      })
    : 0;
  const texted = profile.notify_sms
    ? await sendSms(profile.phone, `${row.plan.headline}\n${top.howToWear}${pack}\n${appUrl()}/`, collage)
    : false;
  const telegrammed =
    profile.notify_telegram && profile.telegram_chat_id
      ? await sendLook(profile.telegram_chat_id, row, 0, appUrl()).then(() => true)
      : false;
  return { user: profile.user_id, plan: row.id, pushed, texted, telegrammed };
}
