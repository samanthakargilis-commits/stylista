"use client";

import { useRef, useState } from "react";
import { DNA_SAMPLE } from "@/lib/types";
import { callApi, useData } from "./data";
import { Button, ErrorNote, inputClass, SectionTitle, useAsync } from "./ui";

export function LookbookSection() {
  const { data, uploadPhoto, addInspiration, updateInspiration, deleteInspiration, updateProfile } = useData();
  const { busy, error, run } = useAsync();
  const [adding, setAdding] = useState(0);
  const [dna, setDna] = useState(data.profile.style_dna);
  const fileInput = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    setAdding(list.length);
    await run(async () => {
      for (const file of list) {
        await addInspiration(await uploadPhoto(file, 900));
        setAdding((n) => n - 1);
      }
    });
    setAdding(0);
  }

  return (
    <div>
      <SectionTitle sub="Screenshots of looks you love from Pinterest, Instagram posts or reels. Claude reads them into your style DNA, which shapes every look and shopping idea.">
        Lookbook
      </SectionTitle>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={() => fileInput.current?.click()} disabled={adding > 0}>
          {adding > 0 ? `Adding ${adding}…` : "+ Add inspiration"}
        </Button>
        <Button
          variant="secondary"
          disabled={busy || data.inspirations.length === 0}
          onClick={() =>
            run(async () => {
              const res = await callApi<{ dna: string }>("/api/style-dna");
              setDna(res.dna);
              await updateProfile({ style_dna: res.dna });
            })
          }
        >
          {busy && adding === 0 ? "Reading your style…" : data.profile.style_dna ? "Refresh my style DNA" : "Read my style DNA"}
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

      {(dna || data.profile.style_dna) && (
        <section className="my-4 rounded-2xl bg-card p-4">
          <h3 className="mb-2 font-serif text-lg text-ink">Your style DNA</h3>
          <textarea
            className={`${inputClass} min-h-32`}
            value={dna}
            onChange={(e) => setDna(e.target.value)}
            onBlur={() => dna !== data.profile.style_dna && updateProfile({ style_dna: dna })}
          />
          <p className="mt-1 text-xs text-muted">Edit it freely. This exact text is what your stylist reads.</p>
        </section>
      )}

      {data.inspirations.length > DNA_SAMPLE && (
        <p className="mb-2 text-xs text-muted">Your style DNA reads your newest {DNA_SAMPLE} looks.</p>
      )}

      <div className="columns-2 gap-3 sm:columns-3">
        {data.inspirations.map((l) => (
          <figure key={l.id} className="mb-3 break-inside-avoid rounded-xl bg-card p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.photo_url} alt={l.note || "Inspiration"} className="w-full rounded-lg" loading="lazy" />
            <div className="mt-1 flex items-center gap-1">
              <input
                className="min-w-0 flex-1 bg-transparent px-1 text-xs text-ink outline-none placeholder:text-muted"
                placeholder="What do you love about it?"
                defaultValue={l.note}
                onBlur={(e) => e.target.value !== l.note && updateInspiration(l.id, e.target.value)}
              />
              <button className="px-1 text-xs text-muted hover:text-danger" aria-label="Remove" onClick={() => deleteInspiration(l.id)}>
                ✕
              </button>
            </div>
          </figure>
        ))}
      </div>
    </div>
  );
}
