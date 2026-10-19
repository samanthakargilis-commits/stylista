"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fileToBlob } from "@/lib/image";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { DayPlanRow, Inspiration, Item, Outfit, Profile, StyleEvent } from "@/lib/types";

export type AppData = {
  userId: string;
  profile: Profile;
  items: Item[];
  events: StyleEvent[];
  inspirations: Inspiration[];
  outfits: Outfit[];
  /** Most recent plan (today's, if it exists). */
  latestPlan: DayPlanRow | null;
};

type Ctx = {
  data: AppData;
  set: React.Dispatch<React.SetStateAction<AppData | null>>;
  reload: () => Promise<void>;
};

const DataContext = createContext<Ctx | null>(null);

async function fetchAll(): Promise<AppData | null> {
  const db = supabaseBrowser();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;
  const [profile, items, events, inspirations, outfits, plan] = await Promise.all([
    db.from("profiles").select("*").single<Profile>(),
    db.from("items").select("*").order("created_at", { ascending: false }).returns<Item[]>(),
    db.from("events").select("*").order("created_at").returns<StyleEvent[]>(),
    db.from("inspirations").select("*").order("created_at", { ascending: false }).returns<Inspiration[]>(),
    db.from("outfits").select("*").order("created_at", { ascending: false }).returns<Outfit[]>(),
    db.from("day_plans").select("*").order("date", { ascending: false }).limit(1).maybeSingle<DayPlanRow>(),
  ]);
  if (profile.error) throw new Error(profile.error.message);
  return {
    userId: auth.user.id,
    profile: profile.data,
    items: items.data ?? [],
    events: events.data ?? [],
    inspirations: inspirations.data ?? [],
    outfits: outfits.data ?? [],
    latestPlan: plan.data ?? null,
  };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const next = await fetchAll();
      if (!next) {
        location.href = "/login";
        return;
      }
      setData(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void reload();
    // Pick up the morning plan (or changes from another device) when the app comes back into view.
    const onVisible = () => document.visibilityState === "visible" && void reload();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload]);

  if (error) return <div className="p-8 text-center text-danger">Couldn&apos;t open your closet: {error}</div>;
  if (!data) return <div className="p-8 text-center text-muted">Opening your closet…</div>;
  return <DataContext.Provider value={{ data, set: setData, reload }}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  const { data, set } = ctx;
  const db = supabaseBrowser();

  /** Apply a change locally right away, then save; reload on failure. */
  async function optimistic(apply: (d: AppData) => AppData, save: () => PromiseLike<{ error: { message: string } | null }>) {
    set((d) => (d ? apply(d) : d));
    const { error } = await save();
    if (error) {
      alert(`Couldn't save: ${error.message}`);
      await ctx!.reload();
    }
  }

  return {
    data,
    reload: ctx.reload,
    setPlan: (row: DayPlanRow) => set((d) => (d ? { ...d, latestPlan: row } : d)),

    updateProfile: (patch: Partial<Profile>) =>
      optimistic(
        (d) => ({ ...d, profile: { ...d.profile, ...patch } }),
        () => db.from("profiles").update(patch).eq("user_id", data.userId),
      ),

    async uploadPhoto(file: Blob, max = 640): Promise<string> {
      const blob = await fileToBlob(file, max);
      const path = `${data.userId}/${crypto.randomUUID()}.jpg`;
      const { error } = await db.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw new Error(error.message);
      return db.storage.from("photos").getPublicUrl(path).data.publicUrl;
    },

    async addItem(item: Partial<Item>): Promise<Item> {
      const { data: row, error } = await db.from("items").insert(item).select().single<Item>();
      if (error) throw new Error(error.message);
      set((d) => (d ? { ...d, items: [row, ...d.items] } : d));
      return row;
    },
    updateItem: (id: string, patch: Partial<Item>) =>
      optimistic(
        (d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }),
        () => db.from("items").update(patch).eq("id", id),
      ),
    deleteItem: (id: string) =>
      optimistic(
        (d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }),
        () => db.from("items").delete().eq("id", id),
      ),
    markWorn: (ids: string[], date: string) =>
      optimistic(
        (d) => ({ ...d, items: d.items.map((i) => (ids.includes(i.id) ? { ...i, clean: false, last_worn: date } : i)) }),
        () => db.from("items").update({ clean: false, last_worn: date }).in("id", ids),
      ),
    laundryDay: (date: string) =>
      optimistic(
        (d) => ({ ...d, items: d.items.map((i) => ({ ...i, clean: true })), profile: { ...d.profile, last_laundry: date } }),
        async () => {
          const a = await db.from("items").update({ clean: true }).eq("user_id", data.userId);
          if (a.error) return a;
          return db.from("profiles").update({ last_laundry: date }).eq("user_id", data.userId);
        },
      ),

    async addEvent(event: Partial<StyleEvent>) {
      const { data: row, error } = await db.from("events").insert(event).select().single<StyleEvent>();
      if (error) throw new Error(error.message);
      set((d) => (d ? { ...d, events: [...d.events, row] } : d));
    },
    deleteEvent: (id: string) =>
      optimistic(
        (d) => ({ ...d, events: d.events.filter((e) => e.id !== id) }),
        () => db.from("events").delete().eq("id", id),
      ),

    async addInspiration(photo_url: string) {
      const { data: row, error } = await db.from("inspirations").insert({ photo_url }).select().single<Inspiration>();
      if (error) throw new Error(error.message);
      set((d) => (d ? { ...d, inspirations: [row, ...d.inspirations] } : d));
    },
    updateInspiration: (id: string, note: string) =>
      optimistic(
        (d) => ({ ...d, inspirations: d.inspirations.map((x) => (x.id === id ? { ...x, note } : x)) }),
        () => db.from("inspirations").update({ note }).eq("id", id),
      ),
    deleteInspiration: (id: string) =>
      optimistic(
        (d) => ({ ...d, inspirations: d.inspirations.filter((x) => x.id !== id) }),
        () => db.from("inspirations").delete().eq("id", id),
      ),

    async saveOutfit(outfit: Partial<Outfit>) {
      const { data: row, error } = outfit.id
        ? await db.from("outfits").update(outfit).eq("id", outfit.id).select().single<Outfit>()
        : await db.from("outfits").insert(outfit).select().single<Outfit>();
      if (error) throw new Error(error.message);
      set((d) => (d ? { ...d, outfits: [row, ...d.outfits.filter((o) => o.id !== row.id)] } : d));
      return row;
    },
    deleteOutfit: (id: string) =>
      optimistic(
        (d) => ({ ...d, outfits: d.outfits.filter((o) => o.id !== id) }),
        () => db.from("outfits").delete().eq("id", id),
      ),
  };
}

export async function callApi<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({ error: "The server sent back something unexpected." }));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json as T;
}

/** Today's date in the person's time zone. */
export function todayIn(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}
