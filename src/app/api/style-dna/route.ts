import type { BetaContentBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import { askForJson, imageBlock } from "@/lib/claude";
import { profileBlock } from "@/lib/prompts";
import { authed } from "@/lib/route";
import { supabaseServer } from "@/lib/supabase/server";
import { DNA_SAMPLE, type Inspiration, type Profile } from "@/lib/types";

export const maxDuration = 120;


const DnaSchema = z.object({
  dna: z
    .string()
    .describe("4-6 sentences in second person describing their personal style: silhouettes, palette, textures, moods, signature moves"),
});

export const POST = authed(async (userId) => {
  const db = await supabaseServer();
  const [{ data: profile }, { data: lookbook }] = await Promise.all([
    db.from("profiles").select("*").eq("user_id", userId).single<Profile>(),
    db.from("inspirations").select("*").order("created_at", { ascending: false }).limit(DNA_SAMPLE).returns<Inspiration[]>(),
  ]);
  if (!profile) throw new Error("Couldn't load your profile.");
  if (!lookbook?.length) return Response.json({ error: "Add a few inspiration images first." }, { status: 400 });

  const content: BetaContentBlockParam[] = [];
  lookbook.forEach((insp, i) => {
    content.push({ type: "text", text: `Inspiration ${i + 1}${insp.note ? `: ${insp.note}` : ""}` });
    content.push(imageBlock(insp.photo_url));
  });
  content.push({
    type: "text",
    text: `These are looks this person saved as inspiration (screenshots from Pinterest, Instagram posts or reels).\n\nAbout them:\n${profileBlock({ ...profile, style_dna: "" })}\n\nDistill their personal style DNA: what these looks have in common, translated into something a stylist can act on with their body type and comfort needs.`,
  });
  const { dna } = await askForJson({
    system: "You are a perceptive personal stylist who reads mood boards.",
    content,
    schema: DnaSchema,
    effort: "medium",
  });
  await db.from("profiles").update({ style_dna: dna }).eq("user_id", userId);
  return Response.json({ dna });
});
