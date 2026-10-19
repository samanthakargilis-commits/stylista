import { authed } from "@/lib/route";
import { supabaseServer } from "@/lib/supabase/server";

export const POST = authed(async (userId, req) => {
  const sub = (await req.json()) as { endpoint: string; keys: { p256dh: string; auth: string } };
  if (!sub.endpoint || !sub.keys) return Response.json({ error: "Bad subscription" }, { status: 400 });
  const db = await supabaseServer();
  const { error } = await db
    .from("push_subscriptions")
    .upsert({ endpoint: sub.endpoint, keys: sub.keys, user_id: userId }, { onConflict: "endpoint" });
  if (error) throw new Error(error.message);
  await db.from("profiles").update({ notify_push: true }).eq("user_id", userId);
  return Response.json({ ok: true });
});
