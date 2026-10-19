import { authed } from "@/lib/route";
import { supabaseServer } from "@/lib/supabase/server";
import { telegramConfigured } from "@/lib/telegram";

/** Makes a one-time code and returns the t.me link that connects this account to the bot. */
export const POST = authed(async (userId) => {
  if (!telegramConfigured()) {
    return Response.json({ error: "Telegram isn't set up on the server yet." }, { status: 400 });
  }
  const code = crypto.randomUUID().replace(/-/g, "");
  const db = await supabaseServer();
  const { error } = await db.from("profiles").update({ telegram_link_code: code }).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return Response.json({ url: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${code}` });
});
