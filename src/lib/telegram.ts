import "server-only";
import type { DayPlanRow } from "./types";

export const telegramConfigured = () => Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME);

type InlineButton = { text: string; url?: string; callback_data?: string };

export async function telegram<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description ?? res.status}`);
  return json.result;
}

/** Caption for one look; Telegram caps photo captions at 1024 characters. */
export function lookCaption(row: DayPlanRow, option: number): string {
  const { plan } = row;
  const look = plan.options[option];
  const parts = [
    option === 0 ? plan.headline : `Option ${option + 1}: ${look.label}`,
    "",
    look.howToWear,
    option === 0 && plan.afterWork ? `\nAfter work: ${plan.afterWork.note}` : "",
    option === 0 && plan.pack ? `\n🎒 Pack: ${plan.pack.note}` : "",
  ];
  const text = parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return text.length > 1024 ? `${text.slice(0, 1021)}…` : text;
}

/** Buttons under each look: mark it worn, see the next option, or open the app. */
export function lookButtons(row: DayPlanRow, option: number, appUrl: string): InlineButton[][] {
  const next = option + 1 < row.plan.options.length ? option + 1 : null;
  return [
    [
      { text: "✓ Wearing this", callback_data: `worn:${row.id}:${option}` },
      ...(next !== null ? [{ text: "Next look →", callback_data: `look:${row.id}:${next}` }] : []),
    ],
    [{ text: "Open Stylista", url: appUrl }],
  ];
}

export async function sendLook(chatId: number, row: DayPlanRow, option: number, appUrl: string) {
  await telegram("sendPhoto", {
    chat_id: chatId,
    photo: `${appUrl}/api/collage/${row.id}?option=${option}&v=${encodeURIComponent(row.created_at)}`,
    caption: lookCaption(row, option),
    reply_markup: { inline_keyboard: lookButtons(row, option, appUrl) },
  });
}
