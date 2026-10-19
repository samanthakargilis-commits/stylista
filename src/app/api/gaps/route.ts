import { z } from "zod";
import { askForJson } from "@/lib/claude";
import { loadPlanningData } from "@/lib/planner";
import { profileBlock, STYLIST_VOICE } from "@/lib/prompts";
import { authed } from "@/lib/route";
import { supabaseServer } from "@/lib/supabase/server";
import { WEEKDAYS } from "@/lib/types";

export const maxDuration = 120;

const GapsSchema = z.object({
  gaps: z
    .array(
      z.object({
        title: z.string().describe("The gap in a few words"),
        why: z.string().describe("Why it matters for their body, comfort and week"),
        buy: z.string().describe("Exactly what to look for: shape, fabric, color"),
      }),
    )
    .describe("Most impactful first, 3 to 6 gaps"),
});

export const POST = authed(async (userId) => {
  const db = await supabaseServer();
  const { profile, items, events } = await loadPlanningData(db, userId);
  const closet = items
    .map((i) => `- ${i.name} (${i.category}; ${i.color}${i.fabric ? `; ${i.fabric}` : ""}${i.brand ? `; ${i.brand}` : ""})`)
    .join("\n");
  const week = profile.week
    .map((d, n) => `${WEEKDAYS[n]}: ${d.work}${d.activities ? `, ${d.activities}` : ""}${d.afterWork ? `, after work: ${d.afterWork}` : ""}`)
    .join("\n");
  const eventLines = events.map((e) => `- ${e.title}${e.notes ? ` (${e.notes})` : ""}`).join("\n");
  const where = [profile.home_place && `Lives in ${profile.home_place.label}`, profile.work_place && `works in ${profile.work_place.label}`]
    .filter(Boolean)
    .join(", ");

  const { gaps } = await askForJson({
    system: STYLIST_VOICE,
    content: [
      {
        type: "text",
        text: `About them:\n${profileBlock(profile)}\n${where ? `${where}.\n` : ""}\nTheir week:\n${week}\n${eventLines ? `\nEvents they dress for:\n${eventLines}\n` : ""}\nTheir closet:\n${closet || "(empty)"}\n\nFind the gaps in this closet: the missing pieces that would unlock the most outfits for their actual week and climate. Every suggestion must suit their body type and fabric needs.`,
      },
    ],
    schema: GapsSchema,
    effort: "medium",
  });
  await db.from("profiles").update({ gaps }).eq("user_id", userId);
  return Response.json({ gaps });
});
