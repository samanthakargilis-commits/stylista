import { describe, expect, it } from "vitest";
import { eventsBetween } from "../calendar";
import { dayBounds } from "../time";

const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//test//EN
BEGIN:VEVENT
UID:yoga@test
DTSTART;TZID=America/Los_Angeles:20260907T180000
DTEND;TZID=America/Los_Angeles:20260907T190000
RRULE:FREQ=WEEKLY;BYDAY=MO,WE
SUMMARY:Yoga
LOCATION:Studio
END:VEVENT
BEGIN:VEVENT
UID:dinner@test
DTSTART:20261021T030000Z
DTEND:20261021T050000Z
SUMMARY:Dinner with Sam
END:VEVENT
BEGIN:VEVENT
UID:other@test
DTSTART:20261025T030000Z
DTEND:20261025T050000Z
SUMMARY:Not today
END:VEVENT
END:VCALENDAR`;

describe("eventsBetween", () => {
  it("expands recurring events and keeps one-offs on the right local day", () => {
    const { start, end } = dayBounds("2026-10-21", "America/Los_Angeles"); // a Wednesday
    const lines = eventsBetween(ics, start, end, "America/Los_Angeles").map((e) => e.line);
    expect(lines).toContain("6:00 PM: Yoga @ Studio");
    expect(lines).not.toContain(expect.stringContaining("Not today"));
  });

  it("puts an evening UTC-stamped event on its local date", () => {
    const { start, end } = dayBounds("2026-10-20", "America/Los_Angeles");
    const lines = eventsBetween(ics, start, end, "America/Los_Angeles").map((e) => e.line);
    expect(lines).toEqual(["8:00 PM: Dinner with Sam"]);
  });
});
