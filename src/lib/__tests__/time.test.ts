import { describe, expect, it } from "vitest";
import { dayBounds, localParts, weekdayOf } from "../time";

describe("time helpers", () => {
  it("reads local date and time in a zone", () => {
    // 07:30 UTC on Oct 19 is 00:30 on Oct 19 in San Francisco (PDT, UTC-7).
    const p = localParts("America/Los_Angeles", new Date("2026-10-19T07:30:00Z"));
    expect(p).toEqual({ date: "2026-10-19", time: "00:30", weekday: 1 });
  });

  it("finds the UTC bounds of a local day, across DST", () => {
    const pdt = dayBounds("2026-10-20", "America/Los_Angeles");
    expect(pdt.start.toISOString()).toBe("2026-10-20T07:00:00.000Z");
    expect(pdt.end.toISOString()).toBe("2026-10-21T06:59:59.999Z");
    const pst = dayBounds("2026-12-01", "America/Los_Angeles");
    expect(pst.start.toISOString()).toBe("2026-12-01T08:00:00.000Z");
  });

  it("knows the weekday of a date", () => {
    expect(weekdayOf("2026-10-20")).toBe(2); // Tuesday
  });
});
