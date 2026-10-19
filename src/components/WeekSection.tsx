"use client";

import { useState } from "react";
import { WEEKDAYS, WORK_MODES, type DayRoutine } from "@/lib/types";
import { useData } from "./data";
import { Button, ErrorNote, Field, inputClass, SectionTitle, useAsync } from "./ui";

const WORK_LABEL = { office: "Office", wfh: "Home (on camera)", either: "Office or home", off: "Off" };
/** Monday-first display order. */
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function WeekSection() {
  const { data, updateProfile, addEvent, deleteEvent } = useData();
  const [draft, setDraft] = useState({ title: "", notes: "", weekday: "" as string, date: "" });
  const { busy, error, run } = useAsync();

  function setDay(index: number, patch: Partial<DayRoutine>) {
    void updateProfile({ week: data.profile.week.map((d, i) => (i === index ? { ...d, ...patch } : d)) });
  }

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle sub="Your looks follow your routine: office-ready, camera-ready at home, and anything you need to pack.">
          Your week
        </SectionTitle>
        <div className="space-y-3">
          {ORDER.map((i) => (
            <DayRow key={i} index={i} day={data.profile.week[i]} onChange={(patch) => setDay(i, patch)} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle sub="Recurring or one-off. Your calendar is read too (set it up under Weather & calendar).">Events</SectionTitle>
        <ul className="mb-4 space-y-2">
          {data.events.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-2 rounded-2xl bg-card p-3 text-sm">
              <div>
                <p className="font-medium text-ink">{e.title}</p>
                <p className="text-muted">
                  {e.weekday !== null ? `Every ${WEEKDAYS[e.weekday]}` : e.date}
                  {e.notes && ` · ${e.notes}`}
                </p>
              </div>
              <button className="text-muted hover:text-danger" aria-label={`Remove ${e.title}`} onClick={() => deleteEvent(e.id)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="space-y-3 rounded-2xl border border-dashed border-line p-3">
          <Field label="Event">
            <input
              className={inputClass}
              placeholder="e.g. Book club, Friend's wedding"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Every week on">
              <select
                className={inputClass}
                value={draft.weekday}
                onChange={(e) => setDraft({ ...draft, weekday: e.target.value, date: "" })}
              >
                <option value="">Not recurring</option>
                {ORDER.map((i) => (
                  <option key={i} value={i}>
                    {WEEKDAYS[i]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Or on date">
              <input
                type="date"
                className={inputClass}
                value={draft.date}
                disabled={draft.weekday !== ""}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Dress code or notes">
            <input
              className={inputClass}
              placeholder="e.g. rooftop, cocktail attire"
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </Field>
          <ErrorNote message={error} />
          <Button
            disabled={busy || !draft.title.trim() || (draft.weekday === "" && !draft.date)}
            onClick={() =>
              run(async () => {
                await addEvent({
                  title: draft.title.trim(),
                  notes: draft.notes,
                  weekday: draft.weekday === "" ? null : Number(draft.weekday),
                  date: draft.weekday === "" ? draft.date : null,
                });
                setDraft({ title: "", notes: "", weekday: "", date: "" });
              })
            }
          >
            Add event
          </Button>
        </div>
      </section>
    </div>
  );
}

/** Text fields save when you leave them, so typing doesn't write on every keystroke. */
function DayRow({ index, day, onChange }: { index: number; day: DayRoutine; onChange: (p: Partial<DayRoutine>) => void }) {
  const [activities, setActivities] = useState(day.activities);
  const [afterWork, setAfterWork] = useState(day.afterWork);
  return (
    <div className="rounded-2xl bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-serif text-lg text-ink">{WEEKDAYS[index]}</span>
        <select
          className="rounded-full border border-line bg-cream px-3 py-1 text-sm text-ink"
          value={day.work}
          onChange={(e) => onChange({ work: e.target.value as DayRoutine["work"] })}
        >
          {WORK_MODES.map((m) => (
            <option key={m} value={m}>
              {WORK_LABEL[m]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className={inputClass}
          placeholder="Pack for… (e.g. yoga after work)"
          value={activities}
          onChange={(e) => setActivities(e.target.value)}
          onBlur={() => activities !== day.activities && onChange({ activities })}
        />
        <input
          className={inputClass}
          placeholder="After work (e.g. drinks, dinner)"
          value={afterWork}
          onChange={(e) => setAfterWork(e.target.value)}
          onBlur={() => afterWork !== day.afterWork && onChange({ afterWork })}
        />
      </div>
    </div>
  );
}
