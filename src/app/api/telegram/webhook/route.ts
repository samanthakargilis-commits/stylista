import { appUrl } from "@/lib/notify";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendLook, telegram } from "@/lib/telegram";
import { localParts } from "@/lib/time";
import type { DayPlanRow, Profile } from "@/lib/types";

type Update = {
  message?: { chat: { id: number }; text?: string };
  callback_query?: { id: string; data?: string; message?: { chat: { id: number } } };
};

/** Telegram calls this for every message to the bot and every button tap. */
export async function POST(req: Request) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  const update = (await req.json()) as Update;
  try {
    if (update.message) await onMessage(update.message.chat.id, update.message.text ?? "");
    if (update.callback_query) await onButton(update.callback_query);
  } catch (err) {
    console.error(err);
  }
  // Always 200 so Telegram doesn't retry the same update forever.
  return Response.json({ ok: true });
}

async function onMessage(chatId: number, text: string) {
  const db = supabaseAdmin();
  const code = /^\/start\s+(\w+)/.exec(text)?.[1];
  if (code) {
    const { data } = await db
      .from("profiles")
      .update({ telegram_chat_id: chatId, notify_telegram: true, telegram_link_code: null })
      .eq("telegram_link_code", code)
      .select("name");
    const name = data?.[0]?.name;
    await telegram("sendMessage", {
      chat_id: chatId,
      text: data?.length
        ? `You're connected${name ? `, ${name}` : ""}! ✨ Your look will arrive here every morning with the outfit collage.`
        : "That link has expired. Open Stylista → More → Morning notification → Connect Telegram to get a fresh one.",
    });
    return;
  }
  await telegram("sendMessage", {
    chat_id: chatId,
    text: `I send your morning look here. To change anything, open Stylista: ${appUrl()}/`,
  });
}

async function onButton(q: NonNullable<Update["callback_query"]>) {
  const db = supabaseAdmin();
  const [action, planId, optionRaw] = (q.data ?? "").split(":");
  const chatId = q.message?.chat.id;
  const option = Number(optionRaw);
  const { data: row } = await db.from("day_plans").select("*").eq("id", planId).maybeSingle<DayPlanRow>();
  const { data: profile } = await db
    .from("profiles")
    .select("*")
    .eq("telegram_chat_id", chatId)
    .maybeSingle<Profile>();
  // Only the plan's owner can act on it.
  if (!row || !profile || profile.user_id !== row.user_id || !row.plan.options[option]) {
    await telegram("answerCallbackQuery", { callback_query_id: q.id, text: "That look isn't available anymore." });
    return;
  }

  if (action === "worn") {
    const look = row.plan.options[option];
    const ids = [...look.itemIds, ...(option === 0 && row.plan.pack ? row.plan.pack.itemIds : [])];
    await db
      .from("items")
      .update({ clean: false, last_worn: localParts(profile.timezone).date })
      .in("id", ids)
      .eq("user_id", profile.user_id);
    await telegram("answerCallbackQuery", { callback_query_id: q.id, text: "Marked those pieces dirty ✓" });
    return;
  }
  if (action === "look") {
    await telegram("answerCallbackQuery", { callback_query_id: q.id });
    await sendLook(chatId!, row, option, appUrl());
  }
}
