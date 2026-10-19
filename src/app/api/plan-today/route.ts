import { planDay } from "@/lib/planner";
import { authed } from "@/lib/route";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { localParts } from "@/lib/time";

export const maxDuration = 120;

/** "Style me now" and "Try another look". */
export const POST = authed(async (userId, req) => {
  const { request = "" } = (await req.json().catch(() => ({}))) as { request?: string };
  const { data: profile } = await (await supabaseServer()).from("profiles").select("timezone").eq("user_id", userId).single();
  const date = localParts(profile?.timezone ?? "America/Los_Angeles").date;
  const row = await planDay(supabaseAdmin(), userId, date, request);
  return Response.json(row);
});
