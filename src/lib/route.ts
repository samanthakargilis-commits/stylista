import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { currentUserId } from "./supabase/server";

/** Wraps a route handler: requires sign-in and turns errors into friendly JSON. */
export function authed<T extends unknown[]>(handler: (userId: string, req: Request, ...rest: T) => Promise<Response>) {
  return async (req: Request, ...rest: T) => {
    const userId = await currentUserId();
    if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });
    try {
      return await handler(userId, req, ...rest);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function errorResponse(err: unknown) {
  if (err instanceof Anthropic.AuthenticationError) {
    return Response.json({ error: "The server's ANTHROPIC_API_KEY is missing or invalid." }, { status: 500 });
  }
  if (err instanceof Anthropic.RateLimitError) {
    return Response.json({ error: "Too many requests right now. Try again in a minute." }, { status: 429 });
  }
  if (err instanceof Anthropic.APIError) {
    return Response.json({ error: `Claude API error (${err.status}).` }, { status: 502 });
  }
  const message = err instanceof Error ? err.message : "Something went wrong.";
  console.error(err);
  return Response.json({ error: message }, { status: 500 });
}
