"use client";

import { useEffect, useState } from "react";
import { ClosetTab } from "./ClosetTab";
import { DataProvider } from "./data";
import { MoreTab } from "./MoreTab";
import { OutfitsTab } from "./OutfitsTab";
import { TodayTab } from "./TodayTab";

const TABS = [
  { id: "today", label: "Today", icon: "☀️", Component: TodayTab },
  { id: "closet", label: "Closet", icon: "👗", Component: ClosetTab },
  { id: "outfits", label: "Outfits", icon: "♡", Component: OutfitsTab },
  { id: "more", label: "More", icon: "☰", Component: MoreTab },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function App() {
  const [tab, setTab] = useState<TabId>("today");

  useEffect(() => {
    const fromHash = location.hash.slice(1);
    if (TABS.some((t) => t.id === fromHash)) setTab(fromHash as TabId);
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js");
  }, []);

  const go = (id: TabId) => {
    setTab(id);
    history.replaceState(null, "", id === "today" ? "/" : `#${id}`);
    window.scrollTo(0, 0);
  };

  const Active = TABS.find((t) => t.id === tab)!.Component;

  return (
    <DataProvider>
      <div className="mx-auto min-h-dvh max-w-2xl px-4 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <p className="mb-4 font-serif text-sm tracking-[0.3em] text-muted">STYLISTA</p>
        <Active />
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${tab === t.id ? "text-ink" : "text-muted"}`}
            >
              <span className={`text-lg leading-6 ${tab === t.id ? "" : "opacity-60 grayscale"}`}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </DataProvider>
  );
}
