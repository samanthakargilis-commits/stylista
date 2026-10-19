"use client";

import type { Gap } from "@/lib/types";
import { callApi, useData } from "./data";
import { Button, ErrorNote, SectionTitle, useAsync } from "./ui";

export function GapsSection() {
  const { data, updateProfile } = useData();
  const { busy, error, run } = useAsync();
  const gaps = data.profile.gaps;

  return (
    <div>
      <SectionTitle sub="What to buy next, based on your body, your fabrics, your week, your weather and what you already own.">
        Closet gaps
      </SectionTitle>
      <Button
        disabled={busy || data.items.length === 0}
        onClick={() =>
          run(async () => {
            const res = await callApi<{ gaps: Gap[] }>("/api/gaps");
            await updateProfile({ gaps: res.gaps });
          })
        }
      >
        {busy ? "Looking through your closet…" : gaps.length ? "Refresh my gaps" : "Find my gaps"}
      </Button>
      <div className="mt-3">
        <ErrorNote message={error} />
      </div>
      <ol className="mt-4 space-y-3">
        {gaps.map((g, i) => (
          <li key={i} className="rounded-2xl bg-card p-4">
            <h3 className="font-serif text-lg text-ink">
              {i + 1}. {g.title}
            </h3>
            <p className="mt-1 text-sm text-muted">{g.why}</p>
            <p className="mt-2 text-sm text-ink">
              <span className="font-medium">Look for:</span> {g.buy}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
