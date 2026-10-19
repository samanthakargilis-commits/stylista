"use client";

import { useRef, useState } from "react";
import { CATEGORIES, type Category, type Item } from "@/lib/types";
import { callApi, todayIn, useData } from "./data";
import { Button, ErrorNote, Field, inputClass, ItemPhoto, SectionTitle, Sheet } from "./ui";

type Filter = "all" | "clean" | "dirty";
type Described = Pick<Item, "name" | "brand" | "category" | "color" | "fabric" | "notes">;

export function ClosetTab() {
  const { data, addItem, updateItem, deleteItem, uploadPhoto, laundryDay } = useData();
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<Category | "any">("any");
  const [editing, setEditing] = useState<Item | null>(null);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const clean = data.items.filter((i) => i.clean).length;
  const shown = data.items.filter(
    (i) => (filter === "all" || (filter === "clean") === i.clean) && (category === "any" || i.category === category),
  );

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files);
    setPending((n) => n + list.length);
    // A few at a time keeps phones and the API happy with big batches.
    const queue = [...list];
    const worker = async () => {
      for (let file = queue.shift(); file; file = queue.shift()) {
        try {
          const photo_url = await uploadPhoto(file);
          const item = await addItem({ photo_url, name: "Reading this piece…" });
          try {
            const described = await callApi<Described>("/api/describe", { photo_url });
            await updateItem(item.id, described);
          } catch (e) {
            await updateItem(item.id, { name: "New piece" });
            setError(`Added it, but couldn't auto-describe one piece (${e instanceof Error ? e.message : e}). Tap ✎ to fill it in.`);
          }
        } catch (e) {
          setError(`Couldn't add a photo: ${e instanceof Error ? e.message : e}`);
        } finally {
          setPending((n) => n - 1);
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  }

  return (
    <div>
      <SectionTitle
        sub={
          <>
            {clean} of {data.items.length} clean
            {data.profile.last_laundry && ` · last laundry ${data.profile.last_laundry}`}. Tap a piece to flip clean ↔ dirty.
          </>
        }
      >
        Closet
      </SectionTitle>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={() => fileInput.current?.click()}>{pending > 0 ? `Adding ${pending}…` : "+ Add pieces"}</Button>
        <Button
          variant="secondary"
          onClick={() => laundryDay(todayIn(data.profile.timezone))}
          disabled={clean === data.items.length}
        >
          🧺 Laundry day
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <ErrorNote message={error} />

      <div className="my-3 flex flex-wrap gap-2 text-sm">
        {(["all", "clean", "dirty"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 capitalize ${filter === f ? "bg-ink text-cream" : "bg-card text-muted"}`}
          >
            {f}
          </button>
        ))}
        <select
          className="rounded-full bg-card px-3 py-1 text-muted"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | "any")}
        >
          <option value="any">Every category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {data.items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
          Add photos of your clothes: product shots, screenshots from Indyx or a shop, or photos on a hanger. You can pick
          lots at once, and Claude fills in the details.
        </p>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {shown.map((item) => (
          <div key={item.id} className="relative">
            <button
              onClick={() => updateItem(item.id, { clean: !item.clean })}
              className="block w-full text-left"
              aria-label={`${item.name}: ${item.clean ? "clean, tap to mark dirty" : "dirty, tap to mark clean"}`}
            >
              <ItemPhoto item={item} className={item.clean ? "" : "opacity-35 grayscale"} />
              {!item.clean && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-ink px-2 py-0.5 text-[10px] font-medium text-cream">
                  dirty
                </span>
              )}
              <p className="mt-1 truncate text-xs text-ink">{item.name}</p>
            </button>
            <button
              onClick={() => setEditing(item)}
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-card/90 text-xs text-ink shadow"
              aria-label={`Edit ${item.name}`}
            >
              ✎
            </button>
          </div>
        ))}
      </div>

      {editing && (
        <ItemEditor
          item={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            void updateItem(editing.id, patch);
            setEditing(null);
          }}
          onDelete={() => {
            void deleteItem(editing.id);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ItemEditor({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: Item;
  onClose: () => void;
  onSave: (patch: Described) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<Described>({
    name: item.name,
    brand: item.brand,
    category: item.category,
    color: item.color,
    fabric: item.fabric,
    notes: item.notes,
  });
  const set = <K extends keyof Described>(k: K, v: Described[K]) => setDraft((d) => ({ ...d, [k]: v }));
  return (
    <Sheet onClose={onClose}>
      <div className="mx-auto mb-4 w-32">
        <ItemPhoto item={item} />
      </div>
      <div className="space-y-3">
        <Field label="Name">
          <input className={inputClass} value={draft.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand">
            <input className={inputClass} value={draft.brand} onChange={(e) => set("brand", e.target.value)} />
          </Field>
          <Field label="Category">
            <select className={inputClass} value={draft.category} onChange={(e) => set("category", e.target.value as Category)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Color">
            <input className={inputClass} value={draft.color} onChange={(e) => set("color", e.target.value)} />
          </Field>
          <Field label="Fabric">
            <input className={inputClass} value={draft.fabric} onChange={(e) => set("fabric", e.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <input className={inputClass} value={draft.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </div>
      <div className="mt-5 flex justify-between">
        <Button variant="ghost" onClick={() => confirm(`Remove ${item.name} from your closet?`) && onDelete()}>
          Remove
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(draft)}>Save</Button>
        </div>
      </div>
    </Sheet>
  );
}
