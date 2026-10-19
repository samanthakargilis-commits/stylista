import { appUrl, sendPush, sendSms } from "@/lib/notify";
import { authed } from "@/lib/route";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Sends a test notification (and a test text, if texts are on). */
export const POST = authed(async (userId) => {
  const db = supabaseAdmin();
  const { data: profile } = await db.from("profiles").select("*").eq("user_id", userId).single<Profile>();
  const pushed = await sendPush(db, userId, {
    title: "Stylista",
    body: "This is where your look will show up each morning ✨",
    url: `${appUrl()}/`,
  });
  const texted = profile?.notify_sms && profile.phone
    ? await sendSms(profile.phone, "Stylista: this is where your look will show up each morning ✨")
    : false;
  return Response.json({ pushed, texted });
});
