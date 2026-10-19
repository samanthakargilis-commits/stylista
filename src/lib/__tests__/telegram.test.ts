import { describe, expect, it } from "vitest";
import { lookButtons, lookCaption } from "../telegram";
import type { DayPlanRow } from "../types";

const row = {
  id: "plan-1",
  user_id: "u1",
  date: "2026-10-20",
  created_at: "2026-10-20T15:00:00Z",
  plan: {
    date: "2026-10-20",
    dayType: "Office day",
    headline: "Black halter + wide-leg trousers, 58° and foggy",
    weather: "",
    calendar: [],
    options: [
      { label: "Sharp", itemIds: ["a", "b"], outfitId: null, howToWear: "Tuck the halter.", why: "" },
      { label: "Soft", itemIds: ["c"], outfitId: null, howToWear: "Belt it.", why: "" },
    ],
    afterWork: null,
    pack: { itemIds: ["y"], note: "Yoga set" },
    heads_up: "",
  },
} as unknown as DayPlanRow;

describe("telegram look messages", () => {
  it("leads the first look with the headline and the pack note", () => {
    const caption = lookCaption(row, 0);
    expect(caption.startsWith(row.plan.headline)).toBe(true);
    expect(caption).toContain("Pack: Yoga set");
  });

  it("labels later looks and skips the pack note", () => {
    const caption = lookCaption(row, 1);
    expect(caption.startsWith("Option 2: Soft")).toBe(true);
    expect(caption).not.toContain("Pack");
  });

  it("caps captions at Telegram's 1024 characters", () => {
    const long = { ...row, plan: { ...row.plan, headline: "x".repeat(2000) } } as DayPlanRow;
    expect(lookCaption(long, 0).length).toBe(1022);
  });

  it("offers Next look only while more looks remain", () => {
    expect(lookButtons(row, 0, "https://app")[0].map((b) => b.callback_data)).toEqual(["worn:plan-1:0", "look:plan-1:1"]);
    expect(lookButtons(row, 1, "https://app")[0].map((b) => b.callback_data)).toEqual(["worn:plan-1:1"]);
  });
});
