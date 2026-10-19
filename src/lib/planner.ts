import "server-only";
import type { BetaContentBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { calendarForDay } from "./calendar";
import { askForJson, imageBlock } from "./claude";
import { profileBlock, STYLIST_VOICE } from "./prompts";
import { weekdayOf } from "./time";
import { WEEKDAYS, type DayPlan, type DayPlanRow, type DayRoutine, type Item, type Outfit, type Profile, type StyleEvent } from "./types";
import { weatherForDay } from "./weather";

const LookSchema = z.object({
  label: z.string().describe("A few words naming this option, e.g. 'Office polish' or 'WFH, camera-ready'"),
  items: z.array(z.number().int()).describe("Item numbers from the clean closet list"),
  savedOutfit: z.number().int().nullable().describe("Saved outfit number if this option is one of their saved outfits, else null"),
  howToWear: z.string().describe("Concrete styling: tucks, layering, cuffs, belts, shoes if known, layers for the weather"),
  why: z.string().describe("One line on why it works for their body, the weather and their day"),
});

const PlanSchema = z.object({
  dayType: z.string().describe("Short label for the day, e.g. 'Office day + yoga'"),
  headline: z
    .string()
    .describe("One line for a phone notification: weather in a few words, then the top look. Max ~90 characters."),
  options: z.array(LookSchema).describe("2 or 3 distinct options for the day, best first"),
  afterWork: z
    .object({ items: z.array(z.number().int()), note: z.string() })
    .nullable()
    .describe("A swap or added layer for after work, matched to the evening weather; null if not a workday and nothing planned"),
  pack: z
    .object({ items: z.array(z.number().int()), note: z.string() })
    .nullable()
    .describe("What to pack in the bag for activities like yoga; null if nothing to pack"),
  heads_up: z
    .string()
    .describe("Optional short note, e.g. laundry is due or a missing piece (like activewear). Empty string if none."),
});

const WORK_LABEL: Record<DayRoutine["work"], string> = {
  office: "In the office: needs to be office-appropriate.",
  wfh: "Working from home: comfy bottoms are fine, but the top must look good on camera.",
  either: "Might be in the office or at home: include an office option and a WFH option.",
  off: "Day off.",
};

export async function loadPlanningData(db: SupabaseClient, userId: string) {
  const [profile, items, events, outfits, recent] = await Promise.all([
    db.from("profiles").select("*").eq("user_id", userId).single<Profile>(),
    db.from("items").select("*").eq("user_id", userId).returns<Item[]>(),
    db.from("events").select("*").eq("user_id", userId).returns<StyleEvent[]>(),
    db.from("outfits").select("*").eq("user_id", userId).returns<Outfit[]>(),
    db.from("day_plans").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(8).returns<DayPlanRow[]>(),
  ]);
  if (profile.error) throw new Error(`Couldn't load profile: ${profile.error.message}`);
  return {
    profile: profile.data,
    items: items.data ?? [],
    events: events.data ?? [],
    outfits: outfits.data ?? [],
    recent: recent.data ?? [],
  };
}

/** Plan one person's day and save it. `request` carries a "try another look" note. */
export async function planDay(db: SupabaseClient, userId: string, date: string, request = ""): Promise<DayPlanRow> {
  const { profile, items, events, outfits, recent } = await loadPlanningData(db, userId);
  const clean = items.filter((i) => i.clean);
  if (clean.length === 0) throw new Error("Nothing is marked clean. Time for laundry day!");

  const weekday = weekdayOf(date);
  const routine = profile.week[weekday] ?? { work: "off", activities: "", afterWork: "" };
  const todaysEvents = events.filter((e) => e.date === date || e.weekday === weekday);

  const [weather, calendar] = await Promise.all([
    weatherForDay({
      home: profile.home_place,
      work: profile.work_place,
      workMode: routine.work,
      timezone: profile.timezone,
      date,
    }).catch(() => ""),
    calendarForDay(profile.calendar_urls, date, profile.timezone).catch(() => [] as string[]),
  ]);

  const content: BetaContentBlockParam[] = [];
  clean.forEach((item, i) => {
    content.push({
      type: "text",
      text: `Item ${i + 1}: ${item.name} (${item.category}; ${item.color}${item.fabric ? `; ${item.fabric}` : ""}${item.brand ? `; ${item.brand}` : ""})${item.notes ? ` — ${item.notes}` : ""}`,
    });
    if (item.photo_url) content.push(imageBlock(item.photo_url));
  });

  const cleanIndex = new Map(clean.map((item, i) => [item.id, i + 1]));
  const readyOutfits = outfits.filter((o) => o.item_ids.length > 0 && o.item_ids.every((id) => cleanIndex.has(id)));
  const nameOf = (id: string) => items.find((i) => i.id === id)?.name ?? "a piece since removed";
  const recentLines = recent
    .filter((r) => r.date !== date)
    .map((r) => `${r.date}: ${r.plan.options?.[0]?.itemIds.map(nameOf).join(" + ") ?? ""}`);
  const previousToday = recent.find((r) => r.date === date);

  content.push({
    type: "text",
    text: `Those are the CLEAN pieces available today. Only use these item numbers.

About them:
${profileBlock(profile)}

Today is ${WEEKDAYS[weekday]}, ${date}.
Work: ${WORK_LABEL[routine.work]}
${routine.activities ? `Activities to pack for: ${routine.activities}` : "Nothing to pack for."}
${routine.afterWork ? `After work: ${routine.afterWork}` : "After work: give a cute after-work variation if it's a workday."}
${weather ? `Weather:\n${weather}` : "Weather: unknown."}
${calendar.length ? `Their calendar today:\n${calendar.map((c) => `- ${c}`).join("\n")}` : ""}
${todaysEvents.length ? `Events today:\n${todaysEvents.map((e) => `- ${e.title}${e.notes ? ` (${e.notes})` : ""}`).join("\n")}` : ""}
${readyOutfits.length ? `Saved outfits that are fully clean today (offer one as an option when it suits the day):\n${readyOutfits.map((o, n) => `Saved outfit ${n + 1}: "${o.name}" = items ${o.item_ids.map((id) => cleanIndex.get(id)).join(", ")}${o.notes ? ` (${o.notes})` : ""}`).join("\n")}` : ""}
${recentLines.length ? `Recent looks (don't repeat these combinations):\n${recentLines.join("\n")}` : ""}
${previousToday ? `They already saw today's looks and want something different. Earlier today: ${previousToday.plan.options.map((o) => o.itemIds.map(nameOf).join(" + ")).join(" / ")}` : ""}
${request ? `Their request: ${request}` : ""}

Plan their outfits for today. Dress for the weather where they'll actually be. If a needed piece doesn't exist in the clean closet (like activewear), make the best of what's there and say so in heads_up.`,
  });

  const result = await askForJson({ system: STYLIST_VOICE, content, schema: PlanSchema, effort: "medium" });

  const toIds = (nums: number[]) => nums.map((n) => clean[n - 1]?.id).filter((id): id is string => Boolean(id));
  const plan: DayPlan = {
    date,
    dayType: result.dayType,
    headline: result.headline,
    weather,
    calendar,
    options: result.options
      .map((o) => ({
        label: o.label,
        itemIds: toIds(o.items),
        outfitId: o.savedOutfit ? (readyOutfits[o.savedOutfit - 1]?.id ?? null) : null,
        howToWear: o.howToWear,
        why: o.why,
      }))
      .filter((o) => o.itemIds.length > 0),
    afterWork: result.afterWork ? { itemIds: toIds(result.afterWork.items), note: result.afterWork.note } : null,
    pack: result.pack ? { itemIds: toIds(result.pack.items), note: result.pack.note } : null,
    heads_up: result.heads_up,
  };
  if (plan.options.length === 0) throw new Error("Couldn't put a look together. Try again.");

  const { data, error } = await db
    .from("day_plans")
    .upsert({ user_id: userId, date, plan }, { onConflict: "user_id,date" })
    .select()
    .single<DayPlanRow>();
  if (error) throw new Error(`Couldn't save today's plan: ${error.message}`);
  return data;
}
