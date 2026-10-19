import { appUrl } from "@/lib/notify";
import { telegram } from "@/lib/telegram";

/** One-time: points the bot at this app. Call with `Authorization: Bearer $CRON_SECRET`. */
export async function POST(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  await telegram("setWebhook", {
    url: `${appUrl()}/api/telegram/webhook`,
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message", "callback_query"],
  });
  return Response.json({ ok: true, webhook: `${appUrl()}/api/telegram/webhook` });
}
