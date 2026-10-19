import { z } from "zod";
import { askForJson, imageBlock } from "@/lib/claude";
import { authed } from "@/lib/route";
import { CATEGORIES } from "@/lib/types";

const Described = z.object({
  name: z.string().describe("Short descriptive name, e.g. 'Chunky mock-neck sweater'"),
  brand: z.string().describe("Brand if visible on a label or caption, otherwise empty string"),
  category: z.enum(CATEGORIES),
  color: z.string(),
  fabric: z.string().describe("Best guess at fabric, or empty string if unclear"),
  notes: z.string().describe("Fit or silhouette notes useful for styling, one short line"),
});

export const POST = authed(async (_userId, req) => {
  const { photo_url } = (await req.json()) as { photo_url: string };
  const result = await askForJson({
    system: "You catalog clothing for a digital closet. Describe the single main garment in the photo.",
    content: [imageBlock(photo_url), { type: "text", text: "Catalog this piece." }],
    schema: Described,
    effort: "low",
  });
  return Response.json(result);
});
