import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaContentBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { z } from "zod";

export const MODEL = "claude-opus-5-5";

const client = new Anthropic();

export function imageBlock(src: string): BetaContentBlockParam {
  if (/^https?:\/\//.test(src)) return { type: "image", source: { type: "url", url: src } };
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(src);
  if (!match) throw new Error("Unsupported image");
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: match[1] as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
      data: match[2],
    },
  };
}

export async function askForJson<S extends z.ZodType>(opts: {
  system: string;
  content: BetaContentBlockParam[];
  schema: S;
  effort: "low" | "medium" | "high";
}): Promise<z.infer<S>> {
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: opts.effort, format: betaZodOutputFormat(opts.schema) },
    system: opts.system,
    messages: [{ role: "user", content: opts.content }],
  });
  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined this request.");
  }
  if (response.parsed_output == null) {
    throw new Error(`Couldn't read Claude's answer (stop: ${response.stop_reason}).`);
  }
  return response.parsed_output;
}
