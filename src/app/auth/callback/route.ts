import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** The link in the sign-in email lands here. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await supabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/", url.origin));
}
