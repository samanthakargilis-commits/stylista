"use client";

import { useState } from "react";
import { WEEKDAYS, type DayPlanRow, type Item, type Look } from "@/lib/types";
import { callApi, todayIn, useData } from "./data";
import { Button, Collage, ErrorNote, inputClass, useAsync } from "./ui";

const WORK_TEXT = { office: "Office day", wfh: "Work from home", either: "Office or home", off: "Day off" };

export function TodayTab() {
  const { data, setPlan, markWorn, saveOutfit } = useData();
  const { busy, error, run } = useAsync();
  const [request, setRequest] = useState("");
  const [optionIndex, setOptionIndex] = useState(0);

  const date = todayIn(data.profile.timezone);
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const routine = data.profile.week[weekday];
  const row = data.latestPlan?.date === date ? data.latestPlan : null;
  const plan = row?.plan;
  const byId = new Map(data.items.map((i) => [i.id, i]));
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((i): i is Item => Boolean(i));
  const cleanCount = data.items.filter((i) => i.clean).length;

  const styleMe = (extra = "") =>
    run(async () => {
      const next = await callApi<DayPlanRow>("/api/plan-today", { request: extra });
      setPlan(next);
      setOptionIndex(0);
      setRequest("");
    });

  const look = plan?.options[Math.min(optionIndex, plan.options.length - 1)];

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-muted">
          {WEEKDAYS[weekday]} · {WORK_TEXT[routine.work]}
          {routine.activities && ` · ${routine.activities}`}
        </p>
        <h1 className="font-serif text-3xl text-ink">
          {data.profile.name ? `Morning, ${data.profile.name}` : "Today's look"}
        </h1>
      </header>

      {data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
          Add your clothes in the Closet tab, then come back for your first look.
        </div>
      ) : !plan || !look ? (
        <div className="rounded-2xl bg-card p-6 text-center">
          <p className="mb-4 text-sm text-muted">
            {cleanCount} clean pieces. Your look arrives at {data.profile.notify_time}, or get it now.
          </p>
          <Button onClick={() => styleMe()} disabled={busy || cleanCount === 0}>
            {busy ? "Checking the weather and your closet…" : "Style me now"}
          </Button>
        </div>
      ) : (
        <>
          {(plan.weather || plan.calendar.length > 0) && (
            <section className="space-y-1 rounded-2xl bg-cream-2 px-4 py-3 text-sm text-ink">
              {plan.weather.split("\n").map((line) => (
                <p key={line}>🌤 {line}</p>
              ))}
              {plan.calendar.map((line) => (
                <p key={line}>📅 {line}</p>
              ))}
            </section>
          )}

          {plan.options.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {plan.options.map((o, i) => (
                <button
                  key={i}
                  onClick={() => setOptionIndex(i)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
                    i === optionIndex ? "bg-ink text-cream" : "bg-card text-muted"
                  }`}
                >
                  {i === 0 ? "★ " : ""}
                  {o.label}
                </button>
              ))}
            </div>
          )}

          <LookCard
            look={look}
            items={pick(look.itemIds)}
            alreadySaved={Boolean(look.outfitId) || data.outfits.some((o) => sameItems(o.item_ids, look.itemIds))}
            onWore={() => markWorn([...look.itemIds, ...(plan.pack?.itemIds ?? [])], date)}
            onSave={() => saveOutfit({ name: look.label, item_ids: look.itemIds, notes: look.howToWear })}
          />

          {plan.afterWork && (
            <section className="rounded-2xl bg-card p-4">
              <h3 className="mb-2 font-serif text-lg text-ink">After work</h3>
              {plan.afterWork.itemIds.length > 0 && <Collage items={pick(plan.afterWork.itemIds)} small />}
              <p className="mt-2 text-sm text-ink">{plan.afterWork.note}</p>
            </section>
          )}
          {plan.pack && (
            <section className="rounded-2xl border-2 border-accent/30 bg-card p-4">
              <h3 className="mb-2 font-serif text-lg text-ink">🎒 Pack in your bag</h3>
              {plan.pack.itemIds.length > 0 && <Collage items={pick(plan.pack.itemIds)} small />}
              <p className="mt-2 text-sm text-ink">{plan.pack.note}</p>
            </section>
          )}
          {plan.heads_up && <p className="rounded-xl bg-cream-2 px-3 py-2 text-sm text-ink">💡 {plan.heads_up}</p>}

          <div className="space-y-2 rounded-2xl bg-card p-4">
            <input
              className={inputClass}
              placeholder="Not feeling it? e.g. cozier, more color, I have a date…"
              value={request}
              onChange={(e) => setRequest(e.target.value)}
            />
            <Button variant="secondary" className="w-full" disabled={busy} onClick={() => styleMe(request)}>
              {busy ? "Restyling…" : "Show me different looks"}
            </Button>
          </div>
        </>
      )}
      <ErrorNote message={error} />
    </div>
  );
}

function sameItems(a: string[], b: string[]) {
  return a.length === b.length && a.every((id) => b.includes(id));
}

function LookCard({
  look,
  items,
  alreadySaved,
  onWore,
  onSave,
}: {
  look: Look;
  items: Item[];
  alreadySaved: boolean;
  onWore: () => void;
  onSave: () => void;
}) {
  const worn = items.length > 0 && items.every((i) => !i.clean);
  return (
    <section className="rounded-2xl bg-card p-4">
      <Collage items={items} />
      <p className="mt-3 text-sm text-ink">{look.howToWear}</p>
      <p className="mt-2 text-sm italic text-muted">{look.why}</p>
      <div className="mt-3 flex gap-2">
        <Button variant={worn ? "secondary" : "primary"} className="flex-1" onClick={onWore} disabled={worn}>
          {worn ? "Marked as worn" : "Wearing this"}
        </Button>
        <Button variant="secondary" onClick={onSave} disabled={alreadySaved}>
          {alreadySaved ? "♥ Saved" : "♡ Save outfit"}
        </Button>
      </div>
    </section>
  );
}
