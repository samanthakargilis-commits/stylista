import { renderCollage } from "@/lib/collage";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { DayPlanRow, Item } from "@/lib/types";

// Plan ids are unguessable UUIDs, so this image is shareable by link (needed for MMS).
export async function GET(req: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const option = Number(new URL(req.url).searchParams.get("option") ?? 0);
  if (!/^[0-9a-f-]{36}$/.test(planId)) return new Response("Not found", { status: 404 });

  const db = supabaseAdmin();
  const { data: row } = await db.from("day_plans").select("*").eq("id", planId).single<DayPlanRow>();
  const look = row?.plan.options[option];
  if (!row || !look) return new Response("Not found", { status: 404 });

  const { data: items } = await db.from("items").select("*").in("id", look.itemIds).returns<Item[]>();
  const pieces = look.itemIds.map((id) => items?.find((i) => i.id === id)).filter((i): i is Item => Boolean(i));
  return renderCollage({
    date: row.date,
    headline: row.plan.headline,
    label: look.label,
    pieces: pieces.map((p) => ({ name: p.name, photo: p.photo_url })),
    pack: option === 0 && row.plan.pack ? row.plan.pack.note : "",
  });
}
