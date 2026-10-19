import { authed } from "@/lib/route";
import { geocode } from "@/lib/weather";

export const GET = authed(async (_userId, req) => {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return Response.json({ error: "Type a neighborhood, city or ZIP." }, { status: 400 });
  const place = await geocode(q);
  if (!place) return Response.json({ error: `Couldn't find "${q}". Try a ZIP code or nearby city.` }, { status: 404 });
  return Response.json(place);
});
