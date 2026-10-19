"use client";

import { useState } from "react";
import { Button, ErrorNote, inputClass, useAsync } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const { busy, error, run } = useAsync();
  const db = supabaseBrowser();

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <p className="font-serif text-sm tracking-[0.3em] text-muted">STYLISTA</p>
      <h1 className="mt-2 font-serif text-4xl text-ink">Your personal stylist</h1>
      <p className="mt-2 text-sm text-muted">A look every morning, from what&apos;s clean in your closet.</p>

      {!sent ? (
        <form
          className="mt-8 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const { error } = await db.auth.signInWithOtp({
                email: email.trim(),
                options: { emailRedirectTo: `${location.origin}/auth/callback` },
              });
              if (error) throw error;
              setSent(true);
            });
          }}
        >
          <input
            className={inputClass}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button className="w-full" disabled={busy}>
            {busy ? "Sending…" : "Email me a sign-in code"}
          </Button>
        </form>
      ) : (
        <form
          className="mt-8 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const { error } = await db.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
              if (error) throw error;
              location.href = "/";
            });
          }}
        >
          <p className="text-sm text-ink">
            Check <b>{email}</b>. Type the code here (best if you added Stylista to your Home Screen), or tap the link in the
            email.
          </p>
          <input
            className={`${inputClass} text-center text-lg tracking-[0.4em]`}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button className="w-full" disabled={busy || code.trim().length < 6}>
            {busy ? "Checking…" : "Sign in"}
          </Button>
          <button type="button" className="w-full text-sm text-muted" onClick={() => setSent(false)}>
            Use a different email
          </button>
        </form>
      )}
      <div className="mt-3">
        <ErrorNote message={error} />
      </div>
    </main>
  );
}
