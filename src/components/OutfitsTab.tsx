"use client";

import { useState } from "react";
import type { Item, Outfit } from "@/lib/types";
import { todayIn, useData } from "./data";
import { Button, Collage, ErrorNote, Field, inputClass, ItemPhoto, SectionTitle, Sheet, useAsync } from "./ui";

export function OutfitsTab() {
  const { data, markWorn } = useData();
  const [editing, setEditing] = useState<Partial<Outfit> | null>(null);
  const byId = new Map(data.items.map((i) => [i.id, i]));
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((i): i is Item => Boolean(i));

  return (
    <div>
      <SectionTitle sub="Your go-to looks. When they're all clean, Stylista will sometimes suggest one.">Outfits</SectionTitle>
      <Button onClick={() => setEditing({ name: "", item_ids: [], notes: "" })} disabled={data.items.length === 0}>
        + New outfit
      </Button>

      {data.outfits.length === 0 && (
        <p className="mt-4 rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
          Build one here, or tap ♡ on a morning look you love.
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {data.outfits.map((o) => {
          const pieces = pick(o.item_ids);
          const ready = pieces.length > 0 && pieces.every((i) => i.clean);
          return (
            <article key={o.id} className="rounded-2xl bg-card p-3">
              <button className="block w-full text-left" onClick={() => setEditing(o)}>
                <Collage items={pieces} />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <h3 className="font-serif text-lg text-ink">{o.name || "Untitled"}</h3>
                  <span className={`text-xs ${ready ? "text-accent" : "text-muted"}`}>{ready ? "All clean" : "Needs laundry"}</span>
                </div>
                {o.notes && <p className="mt-1 line-clamp-2 text-sm text-muted">{o.notes}</p>}
              </button>
              {ready && (
                <Button variant="secondary" className="mt-2 w-full" onClick={() => markWorn(o.item_ids, todayIn(data.profile.timezone))}>
                  Wearing this today
                </Button>
              )}
            </article>
          );
        })}
      </div>

      {editing && <OutfitEditor outfit={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function OutfitEditor({ outfit, onClose }: { outfit: Partial<Outfit>; onClose: () => void }) {
  const { data, saveOutfit, deleteOutfit } = useData();
  const [draft, setDraft] = useState(outfit);
  const { busy, error, run } = useAsync();
  const selected = new Set(draft.item_ids ?? []);

  const toggle = (id: string) =>
    setDraft((d) => ({
      ...d,
      item_ids: selected.has(id) ? (d.item_ids ?? []).filter((x) => x !== id) : [...(d.item_ids ?? []), id],
    }));

  return (
    <Sheet onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name">
          <input
            className={inputClass}
            placeholder="e.g. Office uniform, Sunday brunch"
            value={draft.name ?? ""}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </Field>
        <Field label="How to wear it">
          <textarea
            className={`${inputClass} min-h-16`}
            value={draft.notes ?? ""}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
        </Field>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Pieces ({selected.size})</p>
        <div className="grid max-h-80 grid-cols-4 gap-2 overflow-y-auto">
          {data.items.map((item) => (
            <button key={item.id} onClick={() => toggle(item.id)} className="relative" aria-pressed={selected.has(item.id)}>
              <ItemPhoto item={item} className={selected.has(item.id) ? "ring-2 ring-accent" : "opacity-70"} />
              {selected.has(item.id) && (
                <span className="absolute right-1 top-1 rounded-full bg-accent px-1.5 text-xs text-on-accent">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <ErrorNote message={error} />
      <div className="mt-5 flex justify-between">
        {draft.id ? (
          <Button
            variant="ghost"
            onClick={() => {
              if (confirm("Delete this outfit?")) {
                void deleteOutfit(draft.id!);
                onClose();
              }
            }}
          >
            Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy || selected.size === 0}
            onClick={() =>
              run(async () => {
                await saveOutfit({ id: draft.id, name: draft.name, notes: draft.notes, item_ids: draft.item_ids });
                onClose();
              })
            }
          >
            Save
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
