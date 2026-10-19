import type { Profile } from "./types";

export function profileBlock(p: Profile) {
  const lines = [
    p.name && `Name: ${p.name}`,
    p.body_type && `Body type: ${p.body_type}`,
    p.best_shapes && `Shapes that look best: ${p.best_shapes}`,
    p.fabric_loves && `Fabrics they love: ${p.fabric_loves}`,
    p.fabric_avoids && `Fabrics/pieces they can't wear: ${p.fabric_avoids}`,
    p.style_notes && `Other style notes: ${p.style_notes}`,
    p.style_dna && `Their style DNA (from their inspiration lookbook): ${p.style_dna}`,
  ].filter(Boolean);
  return lines.length ? lines.join("\n") : "(No profile details yet.)";
}

export const STYLIST_VOICE = `You are Stylista, a warm, sharp personal stylist. You know the person's body, comfort needs and week, and you make their real closet feel new.
Everything in their closet is something they're willing to wear: never dismiss a piece. Use their body type to decide how to wear each piece (tucks, belts, layering, proportion, where to show skin), and favor their best shapes when you have a choice.
Write like a friend who's great at this: specific, encouraging, brief. No fashion jargon without a plain explanation.`;
