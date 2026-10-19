"use client";

import { useState } from "react";
import type { Item } from "@/lib/types";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  const styles = {
    primary: "bg-accent text-on-accent hover:opacity-90",
    secondary: "border border-line bg-card text-ink hover:bg-cream-2",
    ghost: "text-muted hover:text-ink",
  }[variant];
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-accent";

export function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="font-serif text-2xl text-ink">{children}</h2>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
  );
}

export function ItemPhoto({ item, className = "" }: { item: Item; className?: string }) {
  return (
    <div className={`flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl bg-white ${className}`}>
      {item.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.photo_url} alt={item.name} className="h-full w-full object-contain" loading="lazy" />
      ) : (
        <span className="p-2 text-center text-xs text-muted">{item.name}</span>
      )}
    </div>
  );
}

export function Collage({ items, small = false }: { items: Item[]; small?: boolean }) {
  if (items.length === 0) return null;
  const cols = small ? "grid-cols-4" : items.length <= 2 || items.length === 4 ? "grid-cols-2" : "grid-cols-3";
  return (
    <div className={`grid ${cols} gap-2 rounded-2xl bg-cream-2 p-2`}>
      {items.map((item) => (
        <div key={item.id}>
          <ItemPhoto item={item} />
          <p className="mt-1 truncate text-center text-xs text-muted">{item.name}</p>
        </div>
      ))}
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger">{message}</p>;
}

export function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-cream p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function useAsync() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}
