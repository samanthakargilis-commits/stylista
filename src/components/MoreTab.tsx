"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { AboutSection } from "./AboutSection";
import { GapsSection } from "./GapsSection";
import { LookbookSection } from "./LookbookSection";
import { NotificationsSection, WeatherCalendarSection } from "./SettingsSection";
import { WeekSection } from "./WeekSection";

const SECTIONS = [
  { id: "notifications", label: "Morning notification", hint: "Time, app alerts and texts", Component: NotificationsSection },
  { id: "week", label: "Your week & events", hint: "Office days, yoga, plans", Component: WeekSection },
  { id: "weather", label: "Weather & calendar", hint: "Home, work and calendar links", Component: WeatherCalendarSection },
  { id: "lookbook", label: "Lookbook", hint: "Inspiration and your style DNA", Component: LookbookSection },
  { id: "gaps", label: "Closet gaps", hint: "What to buy next", Component: GapsSection },
  { id: "about", label: "About you", hint: "Body, shapes, fabrics", Component: AboutSection },
] as const;

export function MoreTab() {
  const [open, setOpen] = useState<(typeof SECTIONS)[number]["id"] | null>(null);
  const section = SECTIONS.find((s) => s.id === open);

  if (section) {
    return (
      <div>
        <button className="mb-4 text-sm text-muted" onClick={() => setOpen(null)}>
          ← More
        </button>
        <section.Component />
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 font-serif text-2xl text-ink">More</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-card">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <button className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setOpen(s.id)}>
              <span>
                <span className="block text-ink">{s.label}</span>
                <span className="block text-xs text-muted">{s.hint}</span>
              </span>
              <span className="text-muted">›</span>
            </button>
          </li>
        ))}
      </ul>
      <button
        className="mt-6 text-sm text-muted"
        onClick={async () => {
          await supabaseBrowser().auth.signOut();
          location.href = "/login";
        }}
      >
        Sign out
      </button>
    </div>
  );
}
